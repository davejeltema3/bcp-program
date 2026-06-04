/**
 * TEMPORARY preview route for the pre-Claude-Design landing page.
 * Re-exports the snapshot stored in app/_legacy/original-landing-v1.tsx
 * so it can be viewed live in a browser.
 *
 * Delete this folder when no longer needed.
 *
 * Window state query param works the same as on /:
 *   /legacy-preview?preview_state=before
 *   /legacy-preview?preview_state=open
 *   /legacy-preview?preview_state=after
 */
export { default } from '../_legacy/original-landing-v1';
