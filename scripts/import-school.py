"""Private, transactional migration. Does not import passwords or active legacy logins."""
import collections, hashlib, json, os, pathlib, sqlite3, sys, time
old_path,new_path,db_path,report_path=sys.argv[1:]
old=json.loads(pathlib.Path(old_path).read_text(encoding='utf-8-sig'))
new=json.loads(pathlib.Path(new_path).read_text(encoding='utf-8-sig'))
digest=hashlib.sha256(pathlib.Path(old_path).read_bytes()+pathlib.Path(new_path).read_bytes()).hexdigest()
conn=sqlite3.connect(db_path);conn.execute('PRAGMA foreign_keys=ON');conn.row_factory=sqlite3.Row
school=conn.execute('SELECT id FROM School WHERE slug=?',('devickys',)).fetchone()
assert school,'DEVICKYS tenant missing'
sid=school['id'];now=int(time.time()*1000)
report={'schoolId':sid,'sourceHash':digest,'inserted':{},'excludedLegacyLogins':{},'unresolved':{},'notes':[]}
def rows(table):return [dict(x) for x in conn.execute('SELECT * FROM "'+table+'" WHERE schoolId=?',(sid,))]
def insert(table,data):
 columns={r['name'] for r in conn.execute('PRAGMA table_info("'+table+'")')}
 data={k:v for k,v in data.items() if k in columns and k!='id'};data['schoolId']=sid
 for k,v in list(data.items()):
  if isinstance(v,(dict,list)):data[k]=json.dumps(v,separators=(',',':'))
 for key in ['createdAt','updatedAt']:
  if key in columns and key not in data and table in ['Student','School','User','Class']:data[key]=now
 names=list(data);sql='INSERT INTO "'+table+'" ('+','.join('"'+x+'"' for x in names)+') VALUES ('+','.join('?' for _ in names)+')'
 rid=conn.execute(sql,[data[x] for x in names]).lastrowid
 report['inserted'][table]=report['inserted'].get(table,0)+1
 return rid
def norm(value):return str(value).strip().casefold()
conn.execute('BEGIN IMMEDIATE')
try:
 conn.execute('CREATE TABLE IF NOT EXISTS LegacyImportReceipt (schoolId TEXT NOT NULL, sourceHash TEXT NOT NULL, report TEXT NOT NULL, PRIMARY KEY(schoolId,sourceHash))')
 prior=conn.execute('SELECT report FROM LegacyImportReceipt WHERE schoolId=? AND sourceHash=?',(sid,digest)).fetchone()
 if prior:
  print('Import already applied; no records changed.');conn.rollback();sys.exit(0)
 for t in ['Student','Class','Subject','Grade','TraitDefinition','TraitGrade','Attendance','DailyAttendance']:
  assert not rows(t),f'{t} already contains school data; manual reconciliation required'
 maps={label:{t:{} for t in ['students','classes','subjects','traits','users']} for label in ['old','new']}
 teacher_email={}; legacy_users={u['id']:u for u in new.get('users',[])}
 for u in new.get('users',[]):
  role=u.get('role')
  if role!='teacher':report['excludedLegacyLogins'][role]=report['excludedLegacyLogins'].get(role,0)+1;continue
  email=u.get('email','').strip().lower()
  assert email and '@' in email,'Invalid teacher email'
  existing=conn.execute('SELECT id,schoolId,role FROM User WHERE email=?',(email,)).fetchone()
  if existing:
   assert existing['schoolId']==sid and existing['role']=='teacher','Email belongs to another account'
   ident=existing['id']
  else:ident=insert('User',{'email':email,'fullName':u['fullName'],'role':'teacher','isAdmin':False,'isSuperAdmin':False,'status':'pending_activation','phone':u.get('phone'),'department':u.get('department')})
  maps['new']['users'][u['id']]=ident;teacher_email[email]=ident
 class_names={}
 for label,data in [('new',new),('old',old)]:
  for row in data['classes']:
   key=norm(row['className'])
   if key not in class_names:
    payload={**row,'teacherId':maps['new']['users'].get(row.get('teacherId'))}
    class_names[key]=insert('Class',payload)
   maps[label]['classes'][row['id']]=class_names[key]
 admissions={}
 for label,data in [('new',new),('old',old)]:
  for row in data['students']:
   key=norm(row['admissionNumber']);assert row['classId'] in maps[label]['classes'],'Missing student class'
   if key not in admissions:admissions[key]=insert('Student',{**row,'classId':maps[label]['classes'][row['classId']]})
   maps[label]['students'][row['id']]=admissions[key]
 for table,model,key in [('subjects','Subject','subjectName'),('traits','TraitDefinition','traitName')]:
  matches=collections.defaultdict(list)
  for label,data in [('new',new),('old',old)]:
   for row in data[table]:
    signature=norm(row[key]);known=matches[signature]
    # Reuse only unambiguous names; retain distinct definitions rather than collapse them.
    if label=='old' and len(known)==1:ident=known[0]
    else:
     payload=dict(row)
     if table=='subjects':
      payload['teacherId']=maps['new']['users'].get(row.get('teacherId'))
      payload['classId']=maps[label]['classes'].get(row.get('classId'))
     ident=insert(model,payload);known.append(ident)
    maps[label][table][row['id']]=ident
 for label,data in [('old',old),('new',new)]:
  for table,model in [('grades','Grade'),('traitGrades','TraitGrade'),('attendance','Attendance'),('dailyAttendance','DailyAttendance'),('comments','Comment')]:
   for row in data.get(table,[]):
    missing=[field for field,collection in [('studentId','students'),('subjectId','subjects'),('traitId','traits'),('classId','classes')] if field in row and row[field] not in maps[label][collection]]
    if missing:
     reason=label+':'+table+':missing-'+','.join(missing)
     report['unresolved'][reason]=report['unresolved'].get(reason,0)+1
     continue
    payload=dict(row);payload['studentId']=maps[label]['students'][row['studentId']]
    for field,collection in [('subjectId','subjects'),('traitId','traits'),('classId','classes')]:
     if field in row:payload[field]=maps[label][collection][row[field]]
    if table=='dailyAttendance':
     teacher_id=maps['new']['users'].get(row.get('teacherId'))
     if teacher_id is None:
      # A historical administrator may have marked attendance. Use the actual pilot admin.
      admin=conn.execute("SELECT id FROM User WHERE schoolId=? AND role='admin' ORDER BY id LIMIT 1",(sid,)).fetchone()
      assert admin,'Provision the pilot administrator before importing daily attendance'
      teacher_id=admin['id']
     payload['teacherId']=teacher_id
    insert(model,payload)
 for row in new.get('tasks',[]):insert('Task',row)
 for row in new.get('auditLogs',[]):insert('AuditLog',{**row,'userId':'legacy:'+str(row.get('userId','unknown'))})
 settings={**old['settings'][0],**new['settings'][0]}
 # Preserve current verified public identity; historical report preferences remain from backup.
 identity=dict(conn.execute('SELECT * FROM School WHERE id=?',(sid,)).fetchone())
 settings.update(schoolName=identity['name'],schoolSlogan=identity['slogan'],address=identity['address'],logoBase64=identity['logoUrl'],brandColor=identity['brandColor'])
 assert not rows('SchoolSettings'),'Existing school settings require reconciliation'
 insert('SchoolSettings',settings)
 assert conn.execute('PRAGMA foreign_key_check').fetchone() is None,'Foreign key validation failed'
 for table,field,parent in [('Grade','studentId','Student'),('Grade','subjectId','Subject'),('TraitGrade','traitId','TraitDefinition'),('TraitGrade','studentId','Student'),('Attendance','studentId','Student'),('Student','classId','Class')]:
  bad=conn.execute(f'SELECT count(*) FROM "{table}" x LEFT JOIN "{parent}" p ON x."{field}"=p.id WHERE x.schoolId=? AND (p.id IS NULL OR p.schoolId<>?)',(sid,sid)).fetchone()[0]
  assert bad==0,'Invalid tenant reference'
 report['notes']=['June roster plus April second-term academic history.','Legacy admin/student login accounts excluded; teacher records require fresh activation.','Original source files retained privately for fields not supported by the current schema.']
 conn.execute('INSERT INTO LegacyImportReceipt VALUES (?,?,?)',(sid,digest,json.dumps(report)))
 conn.commit()
except Exception:
 conn.rollback();raise
finally:conn.close()
os.umask(0o077);pathlib.Path(report_path).write_text(json.dumps(report,indent=2));os.chmod(report_path,0o600)
print(json.dumps(report,indent=2))
