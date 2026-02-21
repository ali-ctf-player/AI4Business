const { io } = require("socket.io-client");

// Serverinizə qoşuluruq
const socket = io("http://localhost:5000");

// Bayaq yaratdığınız istifadəçinin ID-si
const myUserId = "699959d69724131d0fd029a8"; 
const investorId = "699959d69724131d0fd029b9"; // Xəyali bir investor ID-si

socket.on("connect", () => {
  console.log(`✅ Serverə qoşulduq! Socket ID: ${socket.id}`);
  
  // Öz otağımıza (room) qoşuluruq
  socket.emit("join_room", myUserId);
  console.log(`🚪 Otağa daxil olundu: ${myUserId}`);

  // Mesaj göndərməyi simulyasiya edirik (Özümüzə göndəririk ki, test edək)
  console.log("✉️ Mesaj göndərilir...");
  socket.emit("send_message", {
    senderId: investorId,
    receiverId: myUserId,
    content: "Salam Samurai! Startup-ına investisiya etmək istəyirəm."
  });
});

// Gələn mesajları dinləyirik
socket.on("receive_message", (data) => {
  console.log("\n📩 YENİ MESAJ GƏLDİ!");
  console.log(`Kimdən: ${data.senderId}`);
  console.log(`Mətn: ${data.content}\n`);
  
  // Test bitdi, əlaqəni kəsirik
  setTimeout(() => process.exit(0), 1000);
});

socket.on("disconnect", () => {
  console.log("🔌 Serverlə əlaqə kəsildi.");
});
