import { Router, Request } from 'express';
import { z } from 'zod';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = Router();
router.use(authenticate, enforceTenant);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const admin = (req: Request) => req.user!.isAdmin || req.user!.role === 'admin';
const staff = (req: Request) => admin(req) || req.user!.role === 'teacher';
const configured = () => Boolean(process.env.LIVEKIT_URL?.startsWith('wss://') && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
const managedClasses = (req: Request) => ({ schoolId: req.user!.schoolId!, ...(admin(req) ? {} : { teacherId: req.user!.userId }) });
const input = z.object({
  title: z.string().trim().min(3).max(150), classId: z.number().int().positive(),
  startsAt: z.string().datetime(), durationMinutes: z.number().int().min(5).max(240),
  mode: z.enum(['external', 'embedded']),
  meetingUrl: z.string().max(2000).optional(),
});
function validMeetingUrl(raw?: string) {
  try {
    const url = new URL(raw || '');
    return url.protocol === 'https:' && !url.username && !url.password &&
      (url.hostname === 'meet.google.com' || url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us'));
  } catch { return false; }
}
async function visible(req: Request, id: string) {
  const lesson = await prisma.liveLesson.findFirst({ where: { id, schoolId: req.user!.schoolId! } });
  if (!lesson) return null;
  if (staff(req)) {
    return admin(req) || (lesson.teacherId === req.user!.userId && await prisma.class.findFirst({ where: { ...managedClasses(req), id: lesson.classId } })) ? lesson : null;
  }
  if (req.user!.role !== 'student' || !req.user!.studentId) return null;
  const pupil = await prisma.student.findFirst({ where: { id: req.user!.studentId, schoolId: req.user!.schoolId!, classId: lesson.classId, status: 'Active' } });
  return pupil ? lesson : null;
}
router.get('/', async (req, res) => {
  let classIds: number[];
  if (staff(req)) classIds = (await prisma.class.findMany({ where: managedClasses(req), select: { id: true } })).map(c => c.id);
  else {
    const pupil = req.user!.role === 'student' && req.user!.studentId ? await prisma.student.findFirst({ where: { id: req.user!.studentId, schoolId: req.user!.schoolId!, status: 'Active' } }) : null;
    classIds = pupil ? [pupil.classId] : [];
  }
  const classes = await prisma.class.findMany({ where: { schoolId: req.user!.schoolId!, id: { in: classIds } }, select: { id: true, className: true } });
  const lessons = await prisma.liveLesson.findMany({ where: { schoolId: req.user!.schoolId!, classId: { in: classIds }, ...(staff(req) && !admin(req) ? { teacherId: req.user!.userId } : {}) }, orderBy: { startsAt: 'desc' }, take: 100 });
  res.json({ classes, embeddedAvailable: configured(), canManage: staff(req), lessons: lessons.map(({ meetingUrl, roomName, ...lesson }) => lesson) });
});
router.post('/', async (req, res) => {
  if (!staff(req)) { res.status(403).json({ error: 'Only teaching staff can schedule a class.' }); return; }
  const parsed = input.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Enter a title, class, valid start time and duration (5–240 minutes).' }); return; }
  const data = parsed.data;
  if (!await prisma.class.findFirst({ where: { ...managedClasses(req), id: data.classId } })) { res.status(403).json({ error: 'Choose a class assigned to you.' }); return; }
  if (new Date(data.startsAt).getTime() < Date.now() - 60_000) { res.status(400).json({ error: 'Choose a start time in the future.' }); return; }
  if (data.mode === 'embedded' && !configured()) { res.status(503).json({ error: 'In-app video is awaiting server setup. You can use a Meet or Zoom link.' }); return; }
  if (data.mode === 'external' && !validMeetingUrl(data.meetingUrl)) { res.status(400).json({ error: 'Use an HTTPS Google Meet or Zoom meeting link.' }); return; }
  const { meetingUrl, ...fields } = data;
  const lesson = await prisma.liveLesson.create({ data: { ...fields, startsAt: new Date(data.startsAt), schoolId: req.user!.schoolId!, teacherId: req.user!.userId, meetingUrl: data.mode === 'external' ? meetingUrl : null } });
  res.status(201).json({ id: lesson.id });
});
router.post('/:id/start', async (req, res) => {
  const lesson = await visible(req, String(req.params.id));
  if (!lesson || !staff(req)) { res.status(404).json({ error: 'Class not found.' }); return; }
  const changed = await prisma.liveLesson.updateMany({ where: { id: lesson.id, schoolId: req.user!.schoolId!, status: 'scheduled' }, data: { status: 'live' } });
  if (!changed.count && lesson.status !== 'live') { res.status(409).json({ error: 'This class has already ended.' }); return; }
  res.json({ status: 'live' });
});
router.post('/:id/end', async (req, res) => {
  const lesson = await visible(req, String(req.params.id));
  if (!lesson || !staff(req)) { res.status(404).json({ error: 'Class not found.' }); return; }
  await prisma.liveLesson.updateMany({ where: { id: lesson.id, schoolId: req.user!.schoolId! }, data: { status: 'ended' } });
  if (lesson.mode === 'embedded' && configured()) {
    try {
      const client = new RoomServiceClient(process.env.LIVEKIT_URL!.replace(/^wss:/, 'https:'), process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
      const rooms = await client.listRooms([lesson.roomName]);
      if (rooms.length) await client.deleteRoom(lesson.roomName);
    } catch {
      res.status(502).json({ error: 'New joins are closed, but the video provider did not confirm disconnection. Retry End class.' }); return;
    }
  }
  res.json({ status: 'ended' });
});
router.post('/:id/join', async (req, res) => {
  const lesson = await visible(req, String(req.params.id));
  if (!lesson) { res.status(404).json({ error: 'Class not found.' }); return; }
  if (lesson.status !== 'live') { res.status(409).json({ error: 'Wait for your teacher to start the class.' }); return; }
  if (lesson.mode === 'external') { res.json({ mode: 'external', url: lesson.meetingUrl }); return; }
  if (!configured()) { res.status(503).json({ error: 'Video service is not configured.' }); return; }
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { fullName: true } });
  const token = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity: `${lesson.schoolId}:${req.user!.userId}`, name: user?.fullName || 'Participant', ttl: 120 });
  token.addGrant({ roomJoin: true, room: lesson.roomName, canPublish: true, canSubscribe: true, canPublishData: false });
  res.json({ mode: 'embedded', token: await token.toJwt(), serverUrl: process.env.LIVEKIT_URL, title: lesson.title });
});
export default router;
