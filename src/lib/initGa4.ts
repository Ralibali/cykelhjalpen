import { initGa4 } from './ga4Runtime';
(window as unknown as Record<string, unknown>)['ga-disable-G-C0XMZG0KDQ'] = true;
initGa4({
  "measurementId": "G-N9T6SRHBCK",
  "hosts": [
    "cykelhjalpen.se",
    "www.cykelhjalpen.se"
  ],
  "excluded": [
    "/admin",
    "/dashboard",
    "/serviceorder",
    "/mitt-arende",
    "/mina-svar",
    "/offert",
    "/avregistrera",
    "/avsluta-paminnelser"
  ],
  "consentKey": "cykelhjalpen_cookie_consent",
  "consentFormat": "updro"
});
