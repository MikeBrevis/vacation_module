if (localStorage.getItem('token')) {
  window.location.href = 'index.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = document.getElementById('usuario').value;
  const contraseña = document.getElementById('contraseña').value;
  const alertBox = document.getElementById('loginAlert');

  try {
    /* const response = await fetch('http://localhost:3000/auth/login', { */
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contraseña })
    });

    const data = await response.json();

    if (!response.ok) {
      alertBox.textContent = data.message || 'Usuario o contraseña inválidos';
      alertBox.style.display = 'block';
    } else {
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    }
  } catch (error) {
    alertBox.textContent = 'Error de conexión';
    alertBox.style.display = 'block';
  }
});

document.getElementById('togglePassword').addEventListener('click', function () {
  const passwordInput = document.getElementById('contraseña');
  const icon = document.getElementById('toggleIcon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  } else {
    passwordInput.type = 'password';
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  }
});
