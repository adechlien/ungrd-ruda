import {composeApp} from './composition.mjs';
export {createApp} from './http/create-app.mjs';
export const app = composeApp();
export default app;
