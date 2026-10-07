import bcrypt from 'bcryptjs';
async function test() {
    console.log(await bcrypt.hash('password123', 10));
}
test();
