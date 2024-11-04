loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        if (data.token) {
            token = data.token;
            document.getElementById('login').style.display = 'none';
            console.log("Token użytkownika:", token);
            // Użytkownik musi zmienić hasło
            if (data.mustChangePassword) {
                document.getElementById('userPanel').style.display = 'block';
                document.getElementById('changePasswordSection').style.display = 'block';
            } else {
                console.log('Logowanie pomyślne, rola:', data.role);
                if (data.role === 'admin') {
                    document.getElementById('adminPanel').style.display = 'block';
                    document.getElementById('userPanel').style.display = 'none';

                    fetchUsers();
                }
                alert('Zalogowano pomyślnie jako ' + data.role);
            }

            // inicjalizacja przyciskow 
            initializeLogoutButtons();
            initializeChangePasswordButtons();
            initializeAddUserButtons();
            initializeDeleteUserButtons();
            initializeChangeAdminPasswordButton();
            initializeBanUserButtons();
            initializeSetPasswordRestrictionsButtons();


        } else {
            document.getElementById('error-message').style.display = 'block';
        }
    })
    .catch(err => console.error(err));
});






// inicjalizacja wylogowań
function initializeLogoutButtons() {
    console.log('pobranie przyciskow');
    const logoutButtons = document.querySelectorAll('.logoutButton');
    logoutButtons.forEach(logoutButton => {
        // czyszczenie starych eventów
        logoutButton.removeEventListener('click', handleLogout);
        logoutButton.addEventListener('click', handleLogout);
    });
}

function handleLogout() {
    fetch('http://localhost:3000/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Błąd wylogowania');
        }
        return res.json();
    })
    .then(data => {
        console.log(data.message);
        token = '';  
        document.getElementById('userPanel').style.display = 'none'; 
        document.getElementById('adminPanel').style.display = 'none'; 
        document.getElementById('login').style.display = 'block';
        alert(data.message);
    })
    .catch(err => console.error('Błąd:', err));
}

let passwordRestrictionsEnabled = true; 
// walidacja hasła
const validatePassword = (password) => {
    
    const minLength = 8; 
    if (passwordRestrictionsEnabled) {
        if (password.length < minLength) {
            return { valid: false, message: `Hasło musi mieć co najmniej ${minLength} znaków` };
        }
        const uniqueChars = new Set(password); // Użycie Set do unikalnych znaków
        if (uniqueChars.size < password.length) {
            return { valid: false, message: 'Hasło nie może zawierać powtarzających się znaków' };
        }
    }
    return { valid: true };
};


// Zdarzenie dla przycisku zmiany hasła użytkownika
userChangePasswordButton.addEventListener('click', () => {
    const oldPassword = document.getElementById('userOldPassword').value;
    const newPassword = document.getElementById('userNewPassword').value;
    console.log(userChangePasswordButton);
    console.log('Old Password:', oldPassword);
    console.log('New Password:', newPassword);

    const validationResult = validatePassword(newPassword);
    if (!validationResult.valid) {
        alert(validationResult.message);
        return;
    }

    fetch('http://localhost:3000/user/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.message === 'Hasło zmienione pomyślnie') {
            document.getElementById('passwordChangeMessage').textContent = data.message;
            document.getElementById('passwordChangeMessage').style.display = 'block';
        } else {
            alert(data.message);
        }
    })
    .catch(err => console.error('Błąd:', err));
});





//lista userów
// tylko gdy rola to amdin
if (data.role === 'admin') {
    document.getElementById('adminPanel').style.display = 'block';
    console.log("Żądanie do serwera o użytkoników")
    fetchUsers();
}

function fetchUsers() {
    fetch('http://localhost:3000/admin/users', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(users => {
        console.log("Pobrani użytkownicy:", users);
        const userList = document.getElementById('userList');
        userList.innerHTML = ''; 
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = `${user.username} - Rola: ${user.role}`;
            userList.appendChild(li);
        });
        populateUserSelect(users); 
    })
    .catch(err => console.error('Błąd podczas pobierania użytkowników:', err));
}


// Wypełnienie listy użytkowników w polu wyboru
function populateUserSelect(users) {
    const currentUsernameSelect = document.getElementById('currentUsernameSelect');
    currentUsernameSelect.innerHTML = '<option value="" disabled selected>Wybierz użytkownika</option>';
    users.forEach(user => {
        if (user.role === 'user') {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.username;
            currentUsernameSelect.appendChild(option);
            console.log(user.role)
        }
    });
}

//initializacja buttonyu do zmiany hasla
function initializeChangePasswordButtons() {
    console.log('Inicjalizacja przycisku zmiany hasła');
    const changeUserPasswordButtons = document.querySelectorAll('.changeUserPasswordAdmin');
    changeUserPasswordButtons.forEach(button => {
        // Czyszczenie starych eventów
        button.removeEventListener('click', handleChangeUserPassword);
        button.addEventListener('click', handleChangeUserPassword);
    });
}

//zmiana hasla usera
function handleChangeUserPassword() {
    const currentUsername = document.getElementById('currentUsernameSelect').value;
    const newUsername = document.getElementById('newUsername').value;
    const newPassword = document.getElementById('newPassword').value;

    console.log("Próba aktualizacji użytkownika:", { currentUsername, newUsername, newPassword });

    // Wysyłanie zapytania do serwera
    fetch('http://localhost:3000/admin/update-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentUsername, newUsername, newPassword })
    })
    .then(res => {
        if (!res.ok) {
            console.log("Błąd odpowiedzi:", res.status);
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("Odpowiedź serwera na aktualizację użytkownika:", data);
        document.getElementById('updateMessage').textContent = data.message;
        document.getElementById('updateMessage').style.display = 'block';
        fetchUsers();  // Odśwież listę użytkowników
    })
    .catch(err => console.error('Błąd:', err));
}


function initializeAddUserButtons() {
    console.log('Inicjalizacja przycisków dodawania użytkownika');
    const addUserButtons = document.querySelectorAll('.addUserButton');
    addUserButtons.forEach(button => {
        // Czyszczenie starych eventów
        button.removeEventListener('click', handleAddUser);
        button.addEventListener('click', handleAddUser);
    });
}

function handleAddUser() {
    const username = document.getElementById('addNewUsername').value;
    const password = document.getElementById('addNewPassword').value;
    const role = document.getElementById('newRole').value;

    console.log("Dodawanie użytkownika:", { username, role });

    // Wysyłanie zapytania do serwera
    fetch('http://localhost:3000/admin/add-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password, role })
    })
    .then(res => {
        if (!res.ok) {
            console.log("Błąd odpowiedzi:", res.status);
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("Odpowiedź serwera na dodanie użytkownika:", data);
        document.getElementById('updateMessage').textContent = data.message;
        document.getElementById('updateMessage').style.display = 'block';
        fetchUsers();  // Odśwież listę użytkowników
    })
    .catch(err => console.error('Błąd:', err));
}



// inicjalizacja przycisków usuwania
function initializeDeleteUserButtons() {
    console.log('Inicjalizacja przycisków usuwania użytkownika');
    const deleteUserButtons = document.querySelectorAll('.deleteUserButton');
    deleteUserButtons.forEach(button => {
        button.removeEventListener('click', handleDeleteUser);
        button.addEventListener('click', handleDeleteUser);
    });
}

// Funkcja do obsługi usuwania użytkownika
function handleDeleteUser() {
    const username = document.getElementById('currentUsernameSelect').value;

    console.log("Usuwanie użytkownika:", username);

    // Wysyłanie zapytania do serwera
    fetch('http://localhost:3000/admin/delete-user', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username })
    })
    .then(res => {
        if (!res.ok) {
            console.log("Błąd odpowiedzi:", res.status);
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("Odpowiedź serwera na usunięcie użytkownika:", data);
        document.getElementById('updateMessage').textContent = data.message;
        document.getElementById('updateMessage').style.display = 'block';
        fetchUsers();  // Odśwież listę użytkowników
    })
    .catch(err => console.error('Błąd:', err));
}


function initializeChangeAdminPasswordButton() {
    console.log('Inicjalizacja przycisku zmiany hasła administratora');
    const changeAdminPasswordButton = document.querySelector('.changeAdminPasswordButton');
    changeAdminPasswordButton.removeEventListener('click', handleChangeAdminPassword);
    changeAdminPasswordButton.addEventListener('click', handleChangeAdminPassword);
}

async function handleChangeAdminPassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newAdminPassword').value;
    const token = localStorage.getItem('token'); 
    console.log("Token:", token); // Logowanie tokenu

    try {
        const response = await fetch('http://localhost:3000/admin/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                oldPassword: oldPassword,
                newPassword: newPassword
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Zmiana hasła zakończona sukcesem:', data);

        const messageElement = document.getElementById('passwordChangeMessage');
        messageElement.textContent = 'Hasło zmienione pomyślnie';
        messageElement.style.color = 'green'; 
        messageElement.style.display = 'block'; 

        document.getElementById('oldPassword').value = '';
        document.getElementById('newAdminPassword').value = '';

    } catch (error) {
        console.error('Błąd:', error);
        const messageElement = document.getElementById('passwordChangeMessage');
        messageElement.textContent = 'Błąd: ' + error.message;
        messageElement.style.color = 'red'; 
        messageElement.style.display = 'block'; 
    }
}




function initializeBanUserButtons() {
    console.log('Inicjalizacja przycisków banowania użytkowników');
    const banUserButtons = document.querySelectorAll('.banUserButton');
    banUserButtons.forEach(button => {
        button.removeEventListener('click', handleBanUser);
        button.addEventListener('click', handleBanUser);
    });
}

async function handleBanUser() {
    const username = document.getElementById('currentUsernameSelect').value;
    console.log("Banowanie użytkownika:", username);

    try {
        const res = await fetch('http://localhost:3000/admin/ban-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username })
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("Odpowiedź serwera na banowanie użytkownika:", data);
        document.getElementById('updateMessage').textContent = data.message;
        document.getElementById('updateMessage').style.display = 'block';
        fetchUsers(); 
    } catch (err) {
        console.error('Błąd:', err);
        document.getElementById('updateMessage').textContent = 'Błąd: ' + err.message;
        document.getElementById('updateMessage').style.display = 'block';
    }
}



document.querySelector('.setPasswordRestrictionsButton').addEventListener('click', handleSetPasswordRestrictions);


function initializeSetPasswordRestrictionsButtons() {
    const setPasswordRestrictionsButton = document.querySelector('.setPasswordRestrictionsButton');
    setPasswordRestrictionsButton.removeEventListener('click', handleSetPasswordRestrictions);
    setPasswordRestrictionsButton.addEventListener('click', handleSetPasswordRestrictions);
}


function handleSetPasswordRestrictions() {

    const enableRestrictions = document.getElementById('enableRestrictions').value === 'true';
    passwordRestrictionsEnabled = enableRestrictions; 
    console.log("Ograniczenia włączone:", passwordRestrictionsEnabled);

    const username = document.getElementById('currentUsernameSelect').value;

    console.log("Ustawianie ograniczeń dla:", username, "Ograniczenia włączone:", enableRestrictions);

    fetch('http://localhost:3000/admin/set-password-restrictions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, enableRestrictions })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        document.getElementById('setRestrictionsMessage').textContent = data.message;
        document.getElementById('setRestrictionsMessage').style.display = 'block';
        fetchUsers();  
    })
    .catch(err => {
        console.error('Błąd:', err);
        document.getElementById('setRestrictionsMessage').textContent = 'Błąd: ' + err.message;
        document.getElementById('setRestrictionsMessage').style.display = 'block';
    });
}



document.querySelector('.changeAdminPasswordButton').addEventListener('click', handleChangeAdminPassword);

