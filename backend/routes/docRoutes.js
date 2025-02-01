const express = require('express');
const router = express.Router();

// Add documentation route
router.get('/', (req, res) => {
  res.status(200).json({
    title: 'Beehive Community API Documentation',
    version: '1.0.0',
    baseUrl: 'https://beehive-community.onrender.com/api/v1',

    authentication: {
      type: 'JWT',
      header: 'Authorization: Bearer <your_jwt_token>',
      description: 'Most endpoints require JWT authentication token in header',
    },

    endpoints: {
      auth: {
        signup: {
          method: 'POST',
          path: '/users/signup',
          description: 'Register a new user',
          body: {
            firstName: 'string (required)',
            lastName: 'string (optional)',
            username: 'string (required, unique, no spaces)',
            email: 'string (required, valid email)',
            password: 'string (min 8 characters)',
            passwordConfirm: 'string (must match password)',
          },
          response: {
            status: 'success',
            token: 'jwt_token',
            data: {
              user: {
                firstName: 'John',
                lastName: 'Doe',
                username: 'johndoe',
                email: 'john@example.com',
                role: 'user',
                status: 'offline',
              },
            },
          },
        },

        login: {
          method: 'POST',
          path: '/users/login',
          description: 'Login with email and password',
          body: {
            email: 'string (required)',
            password: 'string (required)',
          },
          response: {
            status: 'success',
            token: 'jwt_token',
            data: {
              user: 'User object',
            },
          },
        },

        forgotPassword: {
          method: 'POST',
          path: '/users/forgotPassword',
          description: 'Request password reset code',
          body: {
            email: 'string (required)',
          },
          response: {
            status: 'success',
            message: 'Reset code sent to your email',
          },
        },

        verifyResetCode: {
          method: 'POST',
          path: '/users/verifyResetCode',
          body: {
            resetCode: 'string (required)',
          },
        },

        resetPassword: {
          method: 'PATCH',
          path: '/users/resetPassword',
          body: {
            password: 'string',
            passwordConfirm: 'string',
          },
        },
      },

      socialAuth: {
        google: {
          method: 'GET',
          path: '/users/auth/google',
          description: 'Initiate Google OAuth2 login',
        },
        github: {
          method: 'GET',
          path: '/users/auth/github',
          description: 'Initiate GitHub OAuth login',
        },
      },

      user: {
        getMe: {
          method: 'GET',
          path: '/users/me',
          description: 'Get current user profile',
          requiresAuth: true,
        },
        updateMe: {
          method: 'PATCH',
          path: '/users/updateMe',
          requiresAuth: true,
          body: {
            firstName: 'string (optional)',
            lastName: 'string (optional)',
            email: 'string (optional)',
          },
        },
        updatePassword: {
          method: 'PATCH',
          path: '/users/updateMyPassword',
          requiresAuth: true,
          body: {
            passwordCurrent: 'string',
            password: 'string',
            passwordConfirm: 'string',
          },
        },
        deleteMe: {
          method: 'DELETE',
          path: '/users/deleteMe',
          requiresAuth: true,
        },
      },

      admin: {
        description: "These routes require 'system-admin' role",
        getAllUsers: {
          method: 'GET',
          path: '/users',
          requiresAuth: true,
          requiresAdmin: true,
        },
        getUser: {
          method: 'GET',
          path: '/users/:id',
          requiresAuth: true,
          requiresAdmin: true,
        },
        updateUser: {
          method: 'PATCH',
          path: '/users/:id',
          requiresAuth: true,
          requiresAdmin: true,
        },
        deleteUser: {
          method: 'DELETE',
          path: '/users/:id',
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
    },

    errorCodes: {
      400: 'Bad Request - Invalid input data',
      401: 'Unauthorized - Invalid or missing authentication',
      403: 'Forbidden - Insufficient permissions',
      404: "Not Found - Resource doesn't exist",
      500: 'Internal Server Error',
    },
  });
});

module.exports = router;
