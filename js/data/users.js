export const currentUserId = 2;

export const allUsers = [
  { id: 1, name: "Sofia Martinez", country: "ar", countryName: "Argentina", points: 400, correct: 135, avatar: "avatar.png" },
  { id: 2, name: "Greht Fernandez", country: "ve", countryName: "Venezuela", points: 2000, correct: 1041, avatar: "GrehtFernandez.png" },
  { id: 3, name: "David Chen", country: "cn", countryName: "China", points: 2420, correct: 128, avatar: "avatar.png" },
  { id: 4, name: "Laura Schmidt", country: "de", countryName: "Alemania", points: 2380, correct: 125, avatar: "avatar.png" },
  { id: 5, name: "Kevin Durant", country: "us", countryName: "Estados Unidos", points: 2210, correct: 122, avatar: "avatar.png" },
  { id: 6, name: "Nuevo Usuario", country: "es", countryName: "España", points: 2100, correct: 120, avatar: "avatar.png" },
  { id: 7, name: "Sergio Bustamante", country: "mx", countryName: "México", points: 2050, correct: 118, avatar: "avatar.png" },
  { id: 8, name: "Lupe Arrieta", country: "ar", countryName: "Argentina", points: 2040, correct: 116, avatar: "avatar.png" },
  { id: 9, name: "Celia Cruz", country: "cu", countryName: "Cuba", points: 2020, correct: 111, avatar: "avatar.png" },
  { id: 10, name: "Otro Usuario", country: "br", countryName: "Brasil", points: 2040, correct: 110, avatar: "avatar.png" },
  { id: 11, name: "User 11", country: "fr", countryName: "Francia", points: 2000, correct: 110, avatar: "avatar.png" },
  { id: 12, name: "User 12", country: "it", countryName: "Italia", points: 1950, correct: 108, avatar: "avatar.png" },
  { id: 13, name: "User 13", country: "gb", countryName: "Reino Unido", points: 1900, correct: 105, avatar: "avatar.png" },
  { id: 14, name: "Lunes Martes Miercoles", country: "ar", countryName: "Argentina", points: 2650, correct: 135, avatar: "avatar.png" },
  { id: 15, name: "David Felipe", country: "co", countryName: "Colombia", points: 2420, correct: 128, avatar: "avatar.png" },
  { id: 16, name: "David Darwing", country: "ec", countryName: "Ecuador", points: 2420, correct: 128, avatar: "avatar.png" },
  { id: 17, name: "Lucila Schmidt", country: "at", countryName: "Austria", points: 2380, correct: 125, avatar: "avatar.png" },
  { id: 18, name: "Kevin Kevin", country: "us", countryName: "Estados Unidos", points: 2210, correct: 122, avatar: "avatar.png" },
  { id: 19, name: "Nuevo Usuario2", country: "cl", countryName: "Chile", points: 2100, correct: 120, avatar: "avatar.png" },
  { id: 20, name: "Chichi Peralta", country: "py", countryName: "Paraguay", points: 2050, correct: 118, avatar: "avatar.png" },
  { id: 21, name: "Candy Arrieta", country: "ar", countryName: "Argentina", points: 2040, correct: 116, avatar: "avatar.png" },
  { id: 22, name: "Selena Gomez", country: "us", countryName: "Estados Unidos", points: 2020, correct: 111, avatar: "avatar.png" },
  { id: 23, name: "Otro Usuario3", country: "pe", countryName: "Perú", points: 2040, correct: 110, avatar: "avatar.png" },
  { id: 24, name: "User 11", country: "ve", countryName: "Venezuela", points: 2000, correct: 110, avatar: "avatar.png" },
  { id: 25, name: "User 12", country: "bo", countryName: "Bolivia", points: 1950, correct: 108, avatar: "avatar.png" },
  { id: 26, name: "User 13", country: "uy", countryName: "Uruguay", points: 1900, correct: 105, avatar: "avatar.png" },
  { id: 27, name: "Otro Usuario44", country: "es", countryName: "España", points: 2040, correct: 110, avatar: "avatar.png" },
  { id: 28, name: "User 111", country: "pt", countryName: "Portugal", points: 2000, correct: 110, avatar: "avatar.png" },
  { id: 29, name: "Alex Candal", country: "ca", countryName: "Canadá", points: 1950, correct: 108, avatar: "avatar.png" },
  { id: 30, name: "User 13989", country: "au", countryName: "Australia", points: 1900, correct: 105, avatar: "avatar.png" },
];

export function getProcessedUsers() {
  return [...allUsers]
    .sort((a, b) => {
      const diffPoints = (b.points || 0) - (a.points || 0);
      if (diffPoints !== 0) return diffPoints;

      const diffCorrect = (b.correct || 0) - (a.correct || 0);
      if (diffCorrect !== 0) return diffCorrect;

      return a.name.localeCompare(b.name);
    })
    .map((user, index) => ({
      ...user,
      rank: index + 1
    }));
}

export function getCurrentUser() {
  return getProcessedUsers().find(u => u.id === currentUserId);
}

export function getCountries() {
  const countries = new Map();
  allUsers.forEach(user => {
    if (user.country && user.countryName) {
      countries.set(user.country, user.countryName);
    }
  });
  return Array.from(countries.entries()).map(([code, name]) => ({ code, name }));
}

export function getUsersByCountry(countryCode) {
  if (!countryCode || countryCode === "global") {
    return getProcessedUsers();
  }
  return getProcessedUsers().filter(u => u.country === countryCode);
}