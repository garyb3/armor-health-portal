import bcrypt from 'bcryptjs';

// The password that should be in the database
const testPassword = "AdminPassword123!";
const saltRounds = 12;

async function test() {
  // Hash the password as the seed does
  const hash1 = await bcrypt.hash(testPassword, saltRounds);
  console.log("Hash created by bcrypt.hash(password, 12):");
  console.log(hash1);
  console.log("Length:", hash1.length);
  
  // Verify it works
  const match1 = await bcrypt.compare(testPassword, hash1);
  console.log("\nPassword matches its own hash?", match1);
  
  // Try comparing with a different password
  const noMatch = await bcrypt.compare("WrongPassword123!", hash1);
  console.log("Wrong password matches?", noMatch);
}

test().catch(console.error);
