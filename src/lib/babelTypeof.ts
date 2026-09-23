export default function _typeof(o: any): string {
  if (typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol') {
    return typeof o;
  }
  return o && typeof Symbol === 'function' && o.constructor === Symbol && o !== Symbol.prototype
    ? 'symbol'
    : typeof o;
}
