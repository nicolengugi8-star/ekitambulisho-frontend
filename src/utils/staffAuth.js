import axios from 'axios';
import API_BASE from '../config/api';

export const ADMIN_TOKEN_KEY = 'ek_admin_token';
export const ADMIN_PROFILE_KEY = 'ek_admin_profile';
export const OFFICER_TOKEN_KEY = 'ek_officer_token';
export const OFFICER_PROFILE_KEY = 'ek_officer_profile';
export const CHIEF_TOKEN_KEY = 'ek_chief_token';
export const CHIEF_PROFILE_KEY = 'ek_chief_profile';

const LOGIN_ENDPOINTS = [
  { path: '/api/admin/login' },
  { path: '/api/officer/login' },
  { path: '/api/chief/login' },
];

export function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function resolveAdminProfile(loginResponse, token) {
  const payload = decodeJwtPayload(token);
  const fromLogin =
    loginResponse.admin ||
    loginResponse.user ||
    loginResponse.adminUser ||
    {};

  const role =
    fromLogin.role ||
    loginResponse.role ||
    payload?.role ||
    payload?.admin_role ||
    null;

  const countyName =
    fromLogin.county_name ||
    fromLogin.countyName ||
    payload?.county_name ||
    payload?.countyName ||
    null;

  const username =
    fromLogin.username ||
    loginResponse.username ||
    payload?.username ||
    payload?.sub ||
    '';

  const isCountyAdmin =
    role && String(role).toLowerCase().includes('county');

  return {
    username,
    role: role || (isCountyAdmin ? 'county_admin' : 'super_admin'),
    countyName,
    isCountyAdmin,
    isSuperAdmin: !isCountyAdmin,
  };
}

function resolveOfficeId(loginResponse, token) {
  const fromLogin =
    loginResponse?.officer?.officeId ??
    loginResponse?.officer?.office_id ??
    loginResponse?.officeId ??
    loginResponse?.office_id;

  if (fromLogin != null && fromLogin !== '') {
    return fromLogin;
  }

  const payload = decodeJwtPayload(token);
  return payload?.officeId ?? payload?.office_id ?? null;
}

export function staffRouteForRole(role) {
  switch (role) {
    case 'chief':
      return '/chief';
    case 'officer':
      return '/officer';
    case 'admin':
      return '/admin';
    default:
      return '/staff/login';
  }
}

export function persistStaffSession(role, token, loginResponse) {
  if (role === 'admin') {
    const profile = resolveAdminProfile(loginResponse, token);
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile));
    return;
  }

  if (role === 'officer') {
    const officeId = resolveOfficeId(loginResponse, token);
    const profile = {
      username:
        loginResponse.officer?.username ||
        loginResponse.username ||
        '',
      station: loginResponse.officer?.station_name || loginResponse.station_name || null,
      officeId,
    };
    sessionStorage.setItem(OFFICER_TOKEN_KEY, token);
    sessionStorage.setItem(OFFICER_PROFILE_KEY, JSON.stringify(profile));
    return;
  }

  if (role === 'chief') {
    const wardId = loginResponse.chief?.wardId ?? loginResponse.chief?.ward_id ?? null;
    const profile = {
      username: loginResponse.chief?.username || loginResponse.username || '',
      wardId,
      fullName: loginResponse.chief?.fullName || loginResponse.chief?.full_name || null,
    };
    sessionStorage.setItem(CHIEF_TOKEN_KEY, token);
    sessionStorage.setItem(CHIEF_PROFILE_KEY, JSON.stringify(profile));
  }
}

export async function authenticateStaff(username, password) {
  const body = { username, password };
  let inactiveMessage = null;

  for (const { path } of LOGIN_ENDPOINTS) {
    try {
      const response = await axios.post(`${API_BASE}${path}`, body);
      const token = response.data?.token;

      if (!token) {
        continue;
      }

      const payload = decodeJwtPayload(token);
      const role = payload?.role;

      if (!role || !['admin', 'officer', 'chief'].includes(role)) {
        continue;
      }

      persistStaffSession(role, token, response.data);
      return { role, route: staffRouteForRole(role) };
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 403 && message) {
        inactiveMessage = message;
      }
    }
  }

  if (inactiveMessage) {
    const error = new Error(inactiveMessage);
    error.code = 'INACTIVE';
    throw error;
  }

  const error = new Error('Invalid username or password');
  error.code = 'INVALID';
  throw error;
}
