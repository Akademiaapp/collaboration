import axios from "axios";

// Middleware to verify JWT
const verifyToken = (token) => {
  if (!token) {
    return false;
  }

  // Verify and decode the token
  axios.get('https://auth.akademia.cc/realms/akademia/protocol/openid-connect/userinfo', {
    headers: {
      'Authorization': token
    }
  }).then(response => {
    return response.data;
  }).catch(error => {
    console.error("Token verification failed:", error.message);
    return false;
  });
};

export default { verifyToken };