import { redirect } from 'next/navigation';

/**
 * `/dashboard/report-generation` is not a screen of its own — Home is the
 * landing page for this section. Previously this rendered a placeholder, so
 * anyone who trimmed the URL or followed an old link saw stray text.
 */
export default function ReportGenerationIndex() {
  redirect('/dashboard/report-generation/home');
}
