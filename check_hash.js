import bcrypt from 'bcryptjs';
async function test() {
    const hash = "$2a$10$tZ8QcO8r7g8c40B5r4oDaeHqJ8y6K2h5l6m7n8o9p0q1r2s3t4u5v";
    console.log("Is password123?", await bcrypt.compare('password123', hash));
    console.log("Is user123?", await bcrypt.compare('user123', hash));
    console.log("Is admin123?", await bcrypt.compare('admin123', hash));
    console.log("Is 123456?", await bcrypt.compare('123456', hash));
}
test();
