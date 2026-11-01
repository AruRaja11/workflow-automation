const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Logging you in...";
  sessionStorage.removeItem("workspaceLoggedIn");
  sessionStorage.removeItem("workspaceAuth");

  const formData = new FormData(loginForm);
  const credentials = {
    username: formData.get("username"),
    password: formData.get("password"),
  };

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.detail || "Invalid username or password.");
    }

    if (!result || result.status !== "success") {
      throw new Error("Username or password is wrong.");
    }

    sessionStorage.setItem("workspaceLoggedIn", "true");
    sessionStorage.setItem("workspaceAuth", JSON.stringify(result));
    window.location.assign("/prospecting");
  } catch (error) {
    console.error("Login failed:", error);
    loginStatus.textContent = error.message || "Could not log in. Please try again.";
  }
});
