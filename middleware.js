import axios from "axios";

// Middleware to verify JWT
const verifyToken = (token) => {
  if (!token) {
    return false;
  }
  
  return new Promise((resolve, reject) => {
    // Verify and decode the token
    axios.get('https://auth.akademia.cc/realms/akademia/protocol/openid-connect/userinfo', {
      headers: {
        'Authorization': token
      }
    }).then(response => {
      resolve(response.data);
    }).catch(error => {
      console.error("Token verification failed:", error.message);
      resolve(false);
    });
  })
};

export default { verifyToken };