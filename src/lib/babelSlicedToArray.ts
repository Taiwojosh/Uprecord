export default function _slicedToArray(arr: any, i?: number) {
  if (Array.isArray(arr)) return arr;
  if (typeof Symbol !== 'undefined' && arr && arr[Symbol.iterator]) {
    const _arr: any[] = [];
    const _i = arr[Symbol.iterator]();
    let _s;
    while (!(_s = _i.next()).done) {
      _arr.push(_s.value);
      if (i && _arr.length === i) break;
    }
    return _arr;
  }
  return Array.from(arr || []);
}
