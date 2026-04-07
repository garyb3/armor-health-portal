import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

type FormType = "VOLUNTEER_APP" | "PROFESSIONAL_LICENSE" | "DRUG_SCREEN" | "BACKGROUND_CHECK";
type FormStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "PENDING_REVIEW" | "APPROVED" | "DENIED";

interface DummyApplicant {
  firstName: string;
  lastName: string;
  email: string;
  daysInProcess: number; // how many days ago the applicant was created (controls createdAt)
  hoursInStage: number; // how many hours ago the current stage's statusChangedAt should be
  submissions: { formType: FormType; status: FormStatus }[];
}

const DUMMY_APPLICANTS: DummyApplicant[] = [
  // ============================================================
  // STAGE 1: VOLUNTEER_APP (15 applicants)
  // ============================================================
  { firstName: "Molly", lastName: "Burtch", email: "mollyburtch@gmail.com", daysInProcess: 1, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Deanna", lastName: "Littick", email: "tuba110@aol.com", daysInProcess: 1, hoursInStage: 10, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Christina", lastName: "Stanley", email: "cstanley51978@yahoo.com", daysInProcess: 2, hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Melody", lastName: "Waters", email: "melody.waters@yahoo.com", daysInProcess: 2, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Anna-Stesia", lastName: "Conyers", email: "annaconyers@icloud.com", daysInProcess: 3, hoursInStage: 5, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Amiee", lastName: "Clary", email: "epsaimee@gmail.com", daysInProcess: 1, hoursInStage: 3, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Melissa", lastName: "Peppercorn", email: "mpeppercorn33@gmail.com", daysInProcess: 3, hoursInStage: 12, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Kakra", lastName: "Agyen", email: "kakra@mail.usf.edu", daysInProcess: 4, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Hasti", lastName: "Hooshiari", email: "hooshiari.hasti@gmail.com", daysInProcess: 2, hoursInStage: 9, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Meghan", lastName: "DeMariano", email: "mdemariano2007@mail.com", daysInProcess: 5, hoursInStage: 14, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Shani", lastName: "Pitts", email: "shanim_pitts@yahoo.com", daysInProcess: 7, hoursInStage: 36, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Rebecca", lastName: "Seiple", email: "raseiple@gmail.com", daysInProcess: 8, hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Pamela", lastName: "Rodriguez", email: "pamela.rodriguezfnp@gmail.com", daysInProcess: 10, hoursInStage: 24, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Latasha", lastName: "Sarr", email: "totstewart03@gmail.com", daysInProcess: 16, hoursInStage: 96, submissions: [
    { formType: "VOLUNTEER_APP", status: "IN_PROGRESS" },
  ]},
  { firstName: "Claire", lastName: "Seryak", email: "cseryak@gmail.com", daysInProcess: 18, hoursInStage: 120, submissions: [
    { formType: "VOLUNTEER_APP", status: "PENDING_REVIEW" },
  ]},

  // ============================================================
  // STAGE 2: PROFESSIONAL_LICENSE (15 applicants)
  // ============================================================
  { firstName: "Jennifer", lastName: "DeBoe", email: "jenniferdeboe@sbcglobal.net", daysInProcess: 2, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Chrishawna", lastName: "Jones", email: "noellejf26@gmail.com", daysInProcess: 3, hoursInStage: 5, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Shannon", lastName: "Frazier", email: "shannon_frazier@sbcglobal.net", daysInProcess: 1, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Bobbi", lastName: "Burchinal", email: "bobbiburchinal@gmail.com", daysInProcess: 4, hoursInStage: 10, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Panin", lastName: "Agyen", email: "pa.agyen@gmail.com", daysInProcess: 3, hoursInStage: 7, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Kenderley", lastName: "Mcmillan", email: "chandlerkenderley@icloud.com", daysInProcess: 2, hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Angelette", lastName: "Harris", email: "angielpn12@gmail.com", daysInProcess: 5, hoursInStage: 12, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Michelle", lastName: "Kennedy", email: "kennedymichelle10@yahoo.com", daysInProcess: 4, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Myra", lastName: "Tanksley", email: "jesusisamazzing@hotmail.com", daysInProcess: 3, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Kara", lastName: "Farmer", email: "farmerkara@yahoo.com", daysInProcess: 1, hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Sheena", lastName: "Simpson", email: "sheenasimpson_sm_02@yahoo.com", daysInProcess: 5, hoursInStage: 14, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Latesha", lastName: "Hinton", email: "misstesha.ls@gmail.com", daysInProcess: 9, hoursInStage: 30, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Diana", lastName: "Moses", email: "oxio2@yahoo.com", daysInProcess: 7, hoursInStage: 42, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "IN_PROGRESS" },
  ]},
  { firstName: "Amber", lastName: "King", email: "amber.king5@icloud.com", daysInProcess: 11, hoursInStage: 36, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Michael", lastName: "Bourn", email: "michael.bourn@noemail.placeholder", daysInProcess: 20, hoursInStage: 144, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "PENDING_REVIEW" },
  ]},

  // ============================================================
  // STAGE 3: DRUG_SCREEN (15 applicants)
  // ============================================================
  { firstName: "Abedom", lastName: "Weldemichael", email: "wel.abedom@gmail.com", daysInProcess: 3, hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Sulaiman", lastName: "Jalloh", email: "muftyllah@yahoo.com", daysInProcess: 4, hoursInStage: 10, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Adeline", lastName: "Njilefac", email: "adelineleke@gmail.com", daysInProcess: 2, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Amanda", lastName: "Gullion", email: "adilman1727@gmail.com", daysInProcess: 5, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Samantha", lastName: "Graves", email: "samanthagraves488@gmail.com", daysInProcess: 1, hoursInStage: 5, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Lisa", lastName: "Edmundson", email: "edmundson.lisa@gmail.com", daysInProcess: 3, hoursInStage: 12, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "DeNel", lastName: "Allen", email: "denel.allen@gmail.com", daysInProcess: 4, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Jessica", lastName: "Gullett", email: "shaegullett@yahoo.com", daysInProcess: 2, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Portia", lastName: "Crowder", email: "portia_crowder@yahoo.com", daysInProcess: 5, hoursInStage: 14, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Pinkay", lastName: "Dahn", email: "daviayan91@yahoo.com", daysInProcess: 3, hoursInStage: 7, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Aditi", lastName: "Sheth", email: "aditisheth9@yahoo.com", daysInProcess: 8, hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Misty", lastName: "Fannin", email: "mratliff29@yahoo.com", daysInProcess: 10, hoursInStage: 30, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Adria", lastName: "Dingess", email: "adriadingess@yahoo.com", daysInProcess: 6, hoursInStage: 24, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Jenny", lastName: "Zamor", email: "jzamor1@gmail.com", daysInProcess: 22, hoursInStage: 192, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "IN_PROGRESS" },
  ]},
  { firstName: "Elizabeth", lastName: "Jaeger", email: "jaegerelizabeth716@gmail.com", daysInProcess: 15, hoursInStage: 96, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "PENDING_REVIEW" },
  ]},

  // ============================================================
  // STAGE 4: BACKGROUND_CHECK (12 applicants)
  // ============================================================
  { firstName: "Edwins", lastName: "Smith", email: "edwins165@gmail.com", daysInProcess: 4, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Moses", lastName: "Anning", email: "mosesk1988@gmail.com", daysInProcess: 3, hoursInStage: 6, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},
  { firstName: "Megan", lastName: "Cook", email: "meganrncook@yahoo.com", daysInProcess: 2, hoursInStage: 4, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Brandi", lastName: "Root", email: "brandiroot@ymail.com", daysInProcess: 5, hoursInStage: 12, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},
  { firstName: "Louise", lastName: "Pella", email: "louisepella@yahoo.com", daysInProcess: 1, hoursInStage: 5, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Lov'e", lastName: "White", email: "lrwhite313@mail.com", daysInProcess: 4, hoursInStage: 10, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},
  { firstName: "Rina", lastName: "Webster", email: "rinawebster28@gmail.com", daysInProcess: 3, hoursInStage: 8, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Terri", lastName: "Hamilton", email: "thamilton4812@icloud.com", daysInProcess: 6, hoursInStage: 18, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},
  { firstName: "Melissa", lastName: "Lundy", email: "melissabethlundy@gmail.com", daysInProcess: 7, hoursInStage: 36, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},
  { firstName: "Patricia", lastName: "Fadairo", email: "pfadairo72@gmail.com", daysInProcess: 12, hoursInStage: 24, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},
  { firstName: "Robyn", lastName: "Lefever", email: "robynlefeverrcyb8_ei6@indeedemail.com", daysInProcess: 9, hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "IN_PROGRESS" },
  ]},
  { firstName: "Umilkatun", lastName: "Ibrahim", email: "kaltumibrahimm7582@gmail.com", daysInProcess: 17, hoursInStage: 120, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "PENDING_REVIEW" },
  ]},

  // ============================================================
  // COMPLETED (10 applicants)
  // ============================================================
  { firstName: "Stella", lastName: "Mohler", email: "mohlersr@yahoo.com", daysInProcess: 5, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Kirsten", lastName: "McCutcheon-Morgan", email: "kirsten.morganrn@gmail.com", daysInProcess: 4, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Talese", lastName: "Mix", email: "talesm@icloud.com", daysInProcess: 8, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Amy", lastName: "Guentter", email: "aguentter72@gmail.com", daysInProcess: 3, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Sakea", lastName: "Alfred", email: "moneasakea1@gmail.com", daysInProcess: 11, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Jennifer", lastName: "Bert", email: "jennybee077@gmail.com", daysInProcess: 6, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Raymond", lastName: "Moore", email: "mooreraymond230@gmail.com", daysInProcess: 2, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Sherri", lastName: "Harrell-Lopez", email: "sharrelllopez@yahoo.com", daysInProcess: 28, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Folashade", lastName: "George", email: "folashaday37@yahoo.com", daysInProcess: 20, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},
  { firstName: "Jonda", lastName: "Bauch", email: "jondabau@gmail.com", daysInProcess: 5, hoursInStage: 0, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "APPROVED" },
  ]},

  // ============================================================
  // DENIED (5 applicants)
  // ============================================================
  { firstName: "Meagen", lastName: "Zickefoose", email: "meagenz89@gmail.com", daysInProcess: 14, hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "DENIED" },
  ]},
  { firstName: "Robynne", lastName: "Wilson", email: "livingrm@miamioh.edu", daysInProcess: 9, hoursInStage: 24, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "APPROVED" },
    { formType: "BACKGROUND_CHECK", status: "DENIED" },
  ]},
  { firstName: "Natalie", lastName: "Skolds", email: "marykayoni603@gmail.com", daysInProcess: 18, hoursInStage: 72, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "DENIED" },
  ]},
  { firstName: "Halynn", lastName: "Pack", email: "hpack@ymail.com", daysInProcess: 25, hoursInStage: 120, submissions: [
    { formType: "VOLUNTEER_APP", status: "APPROVED" },
    { formType: "PROFESSIONAL_LICENSE", status: "APPROVED" },
    { formType: "DRUG_SCREEN", status: "DENIED" },
  ]},
  { firstName: "Martin", lastName: "Ryan", email: "martin.ryan@noemail.placeholder", daysInProcess: 16, hoursInStage: 48, submissions: [
    { formType: "VOLUNTEER_APP", status: "DENIED" },
  ]},
];

async function main() {
  // --- Admin user ---
  const email = process.env.ADMIN_EMAIL || "ncampo@armorhealthcare.com";
  const password = process.env.ADMIN_PASSWORD || "AdminPassword123!";

  const existing = await prisma.applicant.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN" || !existing.approved || !existing.emailVerified) {
      await prisma.applicant.update({
        where: { email },
        data: { role: "ADMIN", approved: true, emailVerified: true },
      });
      console.log(`Updated existing user ${email} to ADMIN role.`);
    } else {
      console.log("Admin already exists, skipping admin seed.");
    }
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await prisma.applicant.create({
      data: {
        email,
        password: hashed,
        firstName: "System",
        lastName: "Admin",
        role: "ADMIN",
        approved: true,
        emailVerified: true,
      },
    });
    console.log(`Admin created: ${email}`);
  }

  // --- Staff test users (Recruiter, HR, Admin Assistant) ---
  const staffPassword = await bcrypt.hash("StaffPassword123!", 12);
  const staffUsers = [
    { email: "recruiter@armorhealthcare.com", firstName: "Test", lastName: "Recruiter", role: "RECRUITER" as const },
    { email: "hr@armorhealthcare.com", firstName: "Test", lastName: "HRStaff", role: "HR" as const },
    { email: "assistant@armorhealthcare.com", firstName: "Test", lastName: "Assistant", role: "ADMIN_ASSISTANT" as const },
  ];

  for (const staff of staffUsers) {
    const existingStaff = await prisma.applicant.findUnique({ where: { email: staff.email } });
    if (existingStaff) {
      console.log(`Skipping ${staff.email} (already exists)`);
    } else {
      await prisma.applicant.create({
        data: {
          email: staff.email,
          password: staffPassword,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          approved: true,
          emailVerified: true,
        },
      });
      console.log(`Created staff user: ${staff.firstName} ${staff.lastName} (${staff.email}) [${staff.role}]`);
    }
  }

  // --- Personal test account ---
  const personalExisting = await prisma.applicant.findUnique({ where: { email: "ncampo305@gmail.com" } });
  if (!personalExisting) {
    const personalPassword = await bcrypt.hash("TestPassword123!", 12);
    await prisma.applicant.create({
      data: {
        email: "ncampo305@gmail.com",
        password: personalPassword,
        firstName: "Nick",
        lastName: "Campo",
        role: "APPLICANT",
        approved: true,
        emailVerified: true,
      },
    });
    console.log("Created personal test account: ncampo305@gmail.com [APPLICANT]");
  } else {
    console.log("Skipping ncampo305@gmail.com (already exists)");
  }

  // --- Dummy applicants ---
  const dummyPassword = await bcrypt.hash("TestPassword123!", 12);

  for (const applicant of DUMMY_APPLICANTS) {
    const existingApplicant = await prisma.applicant.findUnique({
      where: { email: applicant.email },
    });

    if (existingApplicant) {
      console.log(`Skipping ${applicant.email} (already exists)`);
      continue;
    }

    const created = await prisma.applicant.create({
      data: {
        email: applicant.email,
        password: dummyPassword,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        role: "APPLICANT",
        approved: true,
        emailVerified: true,
        createdAt: new Date(Date.now() - applicant.daysInProcess * 86_400_000),
      },
    });

    const receiptMap: Record<string, string[]> = {
      "jzamor1@gmail.com": ["DRUG_SCREEN"],
      "mratliff29@yahoo.com": ["DRUG_SCREEN"],
      "pfadairo72@gmail.com": ["BACKGROUND_CHECK"],
      "muftyllah@yahoo.com": ["DRUG_SCREEN"],
    };

    for (let i = 0; i < applicant.submissions.length; i++) {
      const sub = applicant.submissions[i];
      const isCurrentStage = i === applicant.submissions.length - 1;
      // Current stage uses the explicit hoursInStage; earlier stages get a fixed older timestamp
      const hoursAgo = isCurrentStage
        ? applicant.hoursInStage
        : applicant.hoursInStage + (applicant.submissions.length - i) * 24;
      const hasReceipt = receiptMap[applicant.email]?.includes(sub.formType);
      await prisma.formSubmission.create({
        data: {
          applicantId: created.id,
          formType: sub.formType,
          status: sub.status,
          submittedAt: sub.status !== "NOT_STARTED" && sub.status !== "IN_PROGRESS" ? new Date() : null,
          statusChangedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
          // Simulate overdue alerts for applicants stuck >24h in their current stage
          ...(isCurrentStage && applicant.hoursInStage > 24
            ? { lastAlertSentAt: new Date(Date.now() - (applicant.hoursInStage - 12) * 60 * 60 * 1000) }
            : {}),
          // Simulate receipt file uploads
          ...(hasReceipt
            ? { receiptFile: `/uploads/receipt-${sub.formType.toLowerCase()}.pdf` }
            : {}),
        },
      });
    }

    console.log(`Created applicant: ${applicant.firstName} ${applicant.lastName} (${applicant.email})`);
  }

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
