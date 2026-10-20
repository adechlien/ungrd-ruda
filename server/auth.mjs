import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const hashToken = value => createHash('sha256').update(value).digest('hex');
export function hashPassword(value) {const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(value,salt,64).toString('hex');}
export function verifyPassword(value,hash) {const [salt,key]=hash.split(':');const actual=scryptSync(value,salt,64);const expected=Buffer.from(key,'hex');return expected.length===actual.length && timingSafeEqual(actual,expected);}
