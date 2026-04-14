import * as bcrypt from "bcryptjs";

const hashFromDb = "$2b$10$OdLlZ1IfDApoE5Yn..UJeI5EA6ZqgEZzd371tA"; // Truncated but I'll use what I saw
const password = "123456";

async function verify() {
    console.log("Testing password '123456' against hash...");
    const isMatch = await bcrypt.compare(password, hashFromDb);
    console.log("Result:", isMatch);
    
    const newHash = await bcrypt.hash(password, 10);
    console.log("New hash for '123456':", newHash);
}

verify();
