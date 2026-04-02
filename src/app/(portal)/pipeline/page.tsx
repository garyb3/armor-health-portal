"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PipelineList } from "@/components/pipeline/pipeline-list";
import type { PipelineApplicant } from "@/types";

/** Helper: return an ISO date string N days ago from now */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const STATIC_APPLICANTS: PipelineApplicant[] = [
  // ===== MAJORITY: 1–5 days (7 candidates, all moving fine) =====
  {
    id: "1",
    firstName: "Maria",
    lastName: "Santos",
    email: "maria.santos@example.com",
    phone: "555-0101",
    createdAt: daysAgo(0),
    offerAcceptedAt: null,
    currentStage: "VOLUNTEER_APP",
    completedCount: 0,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "IN_PROGRESS", updatedAt: daysAgo(0), statusChangedAt: daysAgo(0) },
      { formType: "PROFESSIONAL_LICENSE", status: "NOT_STARTED", updatedAt: daysAgo(0), statusChangedAt: daysAgo(0) },
      { formType: "DRUG_SCREEN", status: "NOT_STARTED", updatedAt: daysAgo(0), statusChangedAt: daysAgo(0) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(0), statusChangedAt: daysAgo(0) },
    ],
  },
  {
    id: "2",
    firstName: "James",
    lastName: "Carter",
    email: "james.carter@example.com",
    phone: "555-0102",
    createdAt: daysAgo(1),
    offerAcceptedAt: null,
    currentStage: "VOLUNTEER_APP",
    completedCount: 0,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW", updatedAt: daysAgo(0), statusChangedAt: daysAgo(0) },
      { formType: "PROFESSIONAL_LICENSE", status: "NOT_STARTED", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
      { formType: "DRUG_SCREEN", status: "NOT_STARTED", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
    ],
  },
  {
    id: "3",
    firstName: "Olivia",
    lastName: "Martinez",
    email: "olivia.martinez@example.com",
    phone: null,
    createdAt: daysAgo(2),
    offerAcceptedAt: daysAgo(3),
    currentStage: "VOLUNTEER_APP",
    completedCount: 0,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "COMPLETED", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
      { formType: "PROFESSIONAL_LICENSE", status: "NOT_STARTED", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
      { formType: "DRUG_SCREEN", status: "NOT_STARTED", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
    ],
  },
  {
    id: "4",
    firstName: "Aisha",
    lastName: "Patel",
    email: "aisha.patel@example.com",
    phone: "555-0103",
    createdAt: daysAgo(3),
    offerAcceptedAt: daysAgo(4),
    currentStage: "PROFESSIONAL_LICENSE",
    completedCount: 1,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
      { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
      { formType: "DRUG_SCREEN", status: "NOT_STARTED", updatedAt: daysAgo(3), statusChangedAt: daysAgo(3) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(3), statusChangedAt: daysAgo(3) },
    ],
  },
  {
    id: "5",
    firstName: "Robert",
    lastName: "Kim",
    email: "robert.kim@example.com",
    phone: "555-0104",
    createdAt: daysAgo(4),
    offerAcceptedAt: daysAgo(5),
    currentStage: "PROFESSIONAL_LICENSE",
    completedCount: 1,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
      { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
      { formType: "DRUG_SCREEN", status: "NOT_STARTED", updatedAt: daysAgo(4), statusChangedAt: daysAgo(4) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(4), statusChangedAt: daysAgo(4) },
    ],
  },
  {
    id: "6",
    firstName: "Linda",
    lastName: "Nguyen",
    email: "linda.nguyen@example.com",
    phone: "555-0105",
    createdAt: daysAgo(5),
    offerAcceptedAt: daysAgo(6),
    currentStage: "PROFESSIONAL_LICENSE",
    completedCount: 1,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(3), statusChangedAt: daysAgo(3) },
      { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
      { formType: "DRUG_SCREEN", status: "NOT_STARTED", updatedAt: daysAgo(5), statusChangedAt: daysAgo(5) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(5), statusChangedAt: daysAgo(5) },
    ],
  },
  {
    id: "7",
    firstName: "Marcus",
    lastName: "Johnson",
    email: "marcus.johnson@example.com",
    phone: "555-0106",
    createdAt: daysAgo(5),
    offerAcceptedAt: daysAgo(6),
    currentStage: "DRUG_SCREEN",
    completedCount: 2,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(4), statusChangedAt: daysAgo(4) },
      { formType: "PROFESSIONAL_LICENSE", status: "APPROVED", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
      { formType: "DRUG_SCREEN", status: "IN_PROGRESS", updatedAt: daysAgo(1), statusChangedAt: daysAgo(1) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(5), statusChangedAt: daysAgo(5) },
    ],
  },
  // ===== A FEW: 6–19 days (3 candidates, moving along) =====
  {
    id: "8",
    firstName: "Sarah",
    lastName: "Williams",
    email: "sarah.williams@example.com",
    phone: "555-0107",
    createdAt: daysAgo(8),
    offerAcceptedAt: daysAgo(10),
    currentStage: "DRUG_SCREEN",
    completedCount: 2,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(6), statusChangedAt: daysAgo(6) },
      { formType: "PROFESSIONAL_LICENSE", status: "APPROVED", updatedAt: daysAgo(4), statusChangedAt: daysAgo(4) },
      { formType: "DRUG_SCREEN", status: "PENDING_REVIEW", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(8), statusChangedAt: daysAgo(8) },
    ],
  },
  {
    id: "9",
    firstName: "David",
    lastName: "Chen",
    email: "david.chen@example.com",
    phone: "555-0108",
    createdAt: daysAgo(11),
    offerAcceptedAt: daysAgo(13),
    currentStage: "BACKGROUND_CHECK",
    completedCount: 3,
    totalCount: 4,
    hasAnyReceipt: true,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(9), statusChangedAt: daysAgo(9) },
      { formType: "PROFESSIONAL_LICENSE", status: "APPROVED", updatedAt: daysAgo(7), statusChangedAt: daysAgo(7) },
      { formType: "DRUG_SCREEN", status: "APPROVED", updatedAt: daysAgo(4), statusChangedAt: daysAgo(4) },
      { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS", updatedAt: daysAgo(2), statusChangedAt: daysAgo(2) },
    ],
  },
  // STALE: 14 days in, stuck in drug screen for 9 days
  {
    id: "10",
    firstName: "Kevin",
    lastName: "O'Brien",
    email: "kevin.obrien@example.com",
    phone: "555-0112",
    createdAt: daysAgo(14),
    offerAcceptedAt: daysAgo(15),
    currentStage: "DRUG_SCREEN",
    completedCount: 2,
    totalCount: 4,
    isStale: true,
    lastAlertSentAt: daysAgo(2),
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(12), statusChangedAt: daysAgo(12) },
      { formType: "PROFESSIONAL_LICENSE", status: "APPROVED", updatedAt: daysAgo(9), statusChangedAt: daysAgo(9) },
      { formType: "DRUG_SCREEN", status: "IN_PROGRESS", updatedAt: daysAgo(9), statusChangedAt: daysAgo(9) },
      { formType: "BACKGROUND_CHECK", status: "NOT_STARTED", updatedAt: daysAgo(14), statusChangedAt: daysAgo(14) },
    ],
  },
  // ===== RARE: 20–30 days (2 candidates, both completed) =====
  {
    id: "11",
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@example.com",
    phone: "555-0109",
    createdAt: daysAgo(21),
    offerAcceptedAt: daysAgo(22),
    currentStage: "COMPLETED",
    completedCount: 4,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(19), statusChangedAt: daysAgo(19) },
      { formType: "PROFESSIONAL_LICENSE", status: "APPROVED", updatedAt: daysAgo(15), statusChangedAt: daysAgo(15) },
      { formType: "DRUG_SCREEN", status: "APPROVED", updatedAt: daysAgo(9), statusChangedAt: daysAgo(9) },
      { formType: "BACKGROUND_CHECK", status: "APPROVED", updatedAt: daysAgo(3), statusChangedAt: daysAgo(3) },
    ],
  },
  {
    id: "12",
    firstName: "Thomas",
    lastName: "Brown",
    email: "thomas.brown@example.com",
    phone: "555-0110",
    createdAt: daysAgo(25),
    offerAcceptedAt: daysAgo(27),
    currentStage: "COMPLETED",
    completedCount: 4,
    totalCount: 4,
    progress: [
      { formType: "VOLUNTEER_APP", status: "APPROVED", updatedAt: daysAgo(22), statusChangedAt: daysAgo(22) },
      { formType: "PROFESSIONAL_LICENSE", status: "APPROVED", updatedAt: daysAgo(17), statusChangedAt: daysAgo(17) },
      { formType: "DRUG_SCREEN", status: "APPROVED", updatedAt: daysAgo(11), statusChangedAt: daysAgo(11) },
      { formType: "BACKGROUND_CHECK", status: "APPROVED", updatedAt: daysAgo(5), statusChangedAt: daysAgo(5) },
    ],
  },
];

export default function PipelinePage() {
  const [search, setSearch] = useState("");
  const [applicants, setApplicants] = useState<PipelineApplicant[]>(STATIC_APPLICANTS);

  const handleSetOfferDate = (applicantId: string, date: string | null) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === applicantId ? { ...a, offerAcceptedAt: date } : a
      )
    );
  };

  const filtered = search
    ? applicants.filter(
        (a) =>
          `${a.firstName} ${a.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase())
      )
    : applicants;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Applicant Pipeline
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Track where applicants are in the background clearance process.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Applicant list */}
      <PipelineList applicants={filtered} onSetOfferDate={handleSetOfferDate} />
    </div>
  );
}
