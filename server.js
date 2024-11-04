const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const JWT_SECRET = 'supersecretkey';  
let passwordRestrictionsEnabled = true; 

app.use(bodyParser.json());
app.use(cors());

let users = [
    {
        username: 'ADMIN',
        passwordHash: bcrypt.hashSync('admin123', 10),  // Hasło zakodowane bcryptem
        role: "admin",
        mustChangePassword: false,
        isBlocked: false, // Umożliwia blokowanie konta
        restrictedPasswords: ['123456', 'password', 'qwerty'], // Przykładowe zablokowane hasła

    },
    {
        username: 'USER',
        passwordHash: bcrypt.hashSync('user123', 10),
        role: "user",
        mustChangePassword: true,
        isBlocked: false, 
        restrictedPasswords: ['123456', 'password', 'qwerty'], 

    }
];

app.post('/admin/block-user', authenticateToken, (req, res) => {
    const { username } = req.body;
    
    // sprawdz, czy użytkownik ma uprawnienia administratora
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Brak uprawnień' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ message: 'Użytkownik nie znaleziony.' });
    }
    
    user.isBlocked = true; 
    return res.json({ message: 'Konto zostało zablokowane.' });
});

// start serwera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: 'Login lub hasło niepoprawne' });
    }

    if (user.isBlocked) {
        return res.status(403).json({ message: 'Twoje konto jest zablokowane.' });
    }

    // Sprawdzenie poprawności hasła
    if (bcrypt.compareSync(password, user.passwordHash)) {
        const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        // Sprawdzenie, czy użytkownik musi zmienić hasło
        if (user.mustChangePassword) {
            console.log("Musisz zmienić hasło");
            return res.json({ message: 'Musisz zmienić hasło', mustChangePassword: true, token });
        } else {
            console.log("Nie musisz zmieniać hasła");
            return res.json({ token, role: user.role, users: user.role === 'admin' ? users : undefined });
        }
    } else {
        return res.status(401).json({ message: 'Login lub hasło niepoprawne' });
    }
});


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) return res.sendStatus(403); // forbidden, jeśli token jest nieobecny

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // forbidden, jeśli token jest nieważny
        req.user = user; 
        next();
    });
}



app.post('/user/change-password', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Stare i nowe hasło są wymagane' });
    }

    if (!token) {
        return res.status(401).json({ message: 'Brak tokenu' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.username === decoded.username && decoded.role === 'user');

        if (user) {
            if (bcrypt.compareSync(oldPassword, user.passwordHash)) {
                // Sprawdzenie, czy nowe hasło znajduje się na liście zablokowanych
                if (user.restrictedPasswords.includes(newPassword)) {
                    return res.status(400).json({ message: 'Nowe hasło jest zablokowane. Wybierz inne hasło.' });
                }
                
                const passwordValidation = validatePassword(newPassword);
                if (!passwordValidation.valid) {
                    return res.status(400).json({ message: passwordValidation.message });
                }
                user.passwordHash = bcrypt.hashSync(newPassword, 10);
                return res.json({ message: 'Hasło zmienione pomyślnie' });
            } else {
                return res.status(400).json({ message: 'Stare hasło jest niepoprawne' });
            }
        } else {
            return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
        }
    } catch (error) {
        console.error('Błąd JWT:', error);
        return res.status(401).json({ message: 'Nieprawidłowy token' });
    }
});


//lista userów
app.get('/admin/users', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Brak tokenu' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'admin') {
            // filtrowanie userow z rolą admin
            const filteredUsers = users.filter(user => user.role === 'user');
            console.log("Filtered users: ", filteredUsers);
            return res.json(filteredUsers); 
        } else {
            return res.status(403).json({ message: 'Brak dostępu' });
        }
    } catch (error) {
        console.error('Błąd JWT:', error);
        return res.status(401).json({ message: 'Nieprawidłowy token' });
    }
});


app.post('/logout', (req, res) => {
    let revokedTokens = [];

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Header:', authHeader);
    console.log('Token:', token);
    
    if (token) {
        console.log("Zgłoszenie wylogowania tokenu:", token);
        
        try {
            revokedTokens.push(token);
            console.log("Token wylogowany:", token);
            return res.json({ message: 'Wylogowano pomyślnie' });
        } catch (err) {
            console.error("Błąd przy próbie wylogowania:", err);
            return res.status(500).json({ message: 'Błąd serwera' });
        }
    } else {
        console.log("Brak tokenu w nagłówku");
        return res.status(401).json({ message: 'Brak tokenu' });
    }
});






//walidacja hasła
const validatePassword = (password) => {
    const minLength = 8; 
    if (password.length < minLength) {
        return { valid: false, message: `Hasło musi mieć co najmniej ${minLength} znaków` };
    }
    const uniqueChars = new Set(password); // Użycie Set do unikalnych znaków
    if (uniqueChars.size < password.length) {
        return { valid: false, message: 'Hasło nie może zawierać powtarzających się znaków' };
    }
    return { valid: true };
  };



// Aktualizacja danych użytkownika (dla admina)
app.post('/admin/update-user', (req, res) => {
    const { currentUsername, newUsername, newPassword } = req.body;
    console.log(currentUsername, newUsername, newPassword)
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'admin') {
        const user = users.find(u => u.username === currentUsername);
        if (user) {
            user.username = newUsername || user.username;
            if (newPassword) user.passwordHash = bcrypt.hashSync(newPassword, 10);
            return res.json({ message: 'Użytkownik zaktualizowany' });
        } else {
            return res.status(404).json({ message: 'Nie znaleziono użytkownika' });
        }
    } else {
        return res.status(403).json({ message: 'Brak uprawnień' });
    }
});


// endpoint do dodawania userow (tylko admin)
app.post('/admin/add-user', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser = { username, passwordHash, role, mustChangePassword: true };
    users.push(newUser);

    res.json({ message: 'User added successfully', users });
});



// Endpoint do usuwania użytkownika (tylko dla administratora)
app.delete('/admin/delete-user', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }

    const userIndex = users.findIndex(user => user.username === username);
    if (userIndex === -1) {
        return res.status(404).json({ message: 'User not found' });
    }

    users.splice(userIndex, 1);
    res.json({ message: 'User deleted successfully' });
});



app.post('/admin/change-password', authenticateToken, (req, res) => {
    console.log("Nagłówki:", req.headers); 

    const { oldPassword, newPassword } = req.body;

    console.log("Otrzymane dane do zmiany hasła:", { oldPassword, newPassword });

    const currentUser = users.find(user => user.username === req.user.username); 

    if (!currentUser) {
        console.error("Użytkownik nie znaleziony");
        return res.status(404).json({ message: 'User not found' });
    }
z
    const passwordMatch = bcrypt.compareSync(oldPassword, currentUser.passwordHash);
    if (!passwordMatch) {
        console.error("Stare hasło jest niepoprawne");
        return res.status(401).json({ message: 'Old password is incorrect' });
    }

    currentUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    res.json({ message: 'Password changed successfully' });
});


app.post('/admin/ban-user', (req, res) => {
    const { username } = req.body;
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    user.isBlocked = true; 
    res.json({ message: `Użytkownik ${username} został zablokowany.` });
});


// Endpoint do ustawiania ograniczeń haseł
app.post('/admin/set-password-restrictions', (req, res) => {
    const { username, enableRestrictions } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    user.passwordRestrictionsEnabled = enableRestrictions;

    return res.status(200).json({ message: `Ograniczenia hasła dla użytkownika ${username} zostały ${enableRestrictions ? 'włączone' : 'wyłączone'}` });
});
