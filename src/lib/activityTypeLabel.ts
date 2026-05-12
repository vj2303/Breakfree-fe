/**
 * Single source of truth for how an assessment-centre activity should be
 * labelled in the UI.
 *
 * `activityType` is the high-level family ("case-study" or "inbox-activity").
 * `interactiveActivityType` further refines a "case-study" activity into
 * Group Discussion (GD), Roleplay (ROLEPLAY), or Case Study (CASE_STUDY).
 *
 * Used by:
 *  - ParticipantAssessorManagementStep
 *  - AssignParticipantsModal
 *  - any other place that shows "(Case Study)" next to an activity name
 */
export function getActivityTypeLabel(
  activityType?: string | null,
  interactiveActivityType?: string | null
): string {
  const norm = (activityType || "").toLowerCase().replace("_", "-");

  if (norm === "inbox-activity") return "Inbox Activity";

  if (norm === "case-study") {
    switch ((interactiveActivityType || "").toUpperCase()) {
      case "GD":
        return "Group Discussion";
      case "ROLEPLAY":
        return "Roleplay";
      case "CASE_STUDY":
        return "Case Study";
      default:
        // Fall back to "Interactive Activity" so the label is at least honest
        // about the family when the sub-type wasn't loaded.
        return "Interactive Activity";
    }
  }

  return activityType || "Unknown";
}
