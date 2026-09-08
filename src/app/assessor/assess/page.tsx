'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';

interface AssessmentCenter {
  assignmentId: string;
  assessmentCenterId: string;
  assessmentCenterName: string;
  assessmentCenterDescription: string;
  participantCount: number;
}

interface GroupData {
  groupId: string;
  groupName: string;
  adminName: string;
  adminEmail: string;
  assessmentCenters: AssessmentCenter[];
  totalParticipantCount: number;
}

export default function AssessorGroups() {
  const router = useRouter();
  const { assessorGroups, assessorGroupsLoading, fetchAssessorGroups } = useAuth();

  useEffect(() => {
    if (!assessorGroups && !assessorGroupsLoading) fetchAssessorGroups();
  }, [assessorGroups, assessorGroupsLoading, fetchAssessorGroups]);

  const groups: GroupData[] = assessorGroups?.groups || [];

  /** Open the group; its detail view carries a tab per assessment centre. */
  const openGroup = (group: GroupData) => {
    const firstCentre = group.assessmentCenters?.[0];
    router.push(
      `/assessor/assess/${group.groupId}${
        firstCentre ? `?assessmentCenterId=${firstCentre.assessmentCenterId}` : ''
      }`
    );
  };

  return (
    <div className="view-enter">
      <p className="text-[12.5px] text-[var(--ap-grey)]">Assess</p>
      <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--ap-ink)]">
        Groups
      </h1>
      <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-[var(--ap-grey)]">
        Select a group to view its assessment centres and participants.
      </p>

      {assessorGroupsLoading ? (
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((card) => (
            <div
              key={card}
              className="rounded-xl border border-[var(--ap-border)] bg-[var(--ap-card)] px-[22px] py-5"
            >
              <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
              <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
              <div className="mt-6 h-3 w-1/3 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-7 rounded-xl border border-[var(--ap-border)] bg-[var(--ap-card)] px-6 py-12 text-center text-sm text-[var(--ap-grey)]">
          No groups are assigned to you yet.
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <button
              key={group.groupId}
              type="button"
              onClick={() => openGroup(group)}
              className="rounded-xl border border-[var(--ap-border)] bg-[var(--ap-card)] px-[22px] py-5 text-left transition-colors hover:border-[var(--ap-navy)]"
            >
              <p className="text-[15.5px] font-bold text-[var(--ap-ink)]">{group.groupName}</p>
              <p className="mt-2 text-[12.5px] text-[var(--ap-grey)]">
                Admin: <b className="font-semibold text-[var(--ap-ink)]">{group.adminName}</b>
                {group.adminEmail && <> · {group.adminEmail}</>}
              </p>
              <div className="mt-4 flex gap-5 border-t border-[var(--ap-border)] pt-3.5">
                <span className="text-[12.5px] text-[var(--ap-grey)]">
                  Assessments:{' '}
                  <b className="font-semibold text-[var(--ap-ink)]">
                    {group.assessmentCenters.length}
                  </b>
                </span>
                <span className="text-[12.5px] text-[var(--ap-grey)]">
                  Participants:{' '}
                  <b className="font-semibold text-[var(--ap-ink)]">
                    {group.totalParticipantCount}
                  </b>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
