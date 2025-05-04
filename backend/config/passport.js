const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GithubStrategy = require("passport-github2").Strategy;
const User = require("../models/userModel");

// GOOGLE AUTH
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // onrender.com for production
      scope: ["profile", "email"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. First, try to find user by googleId
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        // 2. If not found by googleId, try to find by email
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          // User exists but hasn't used Google login before
          user.googleId = profile.id;
          user.avatar = profile.photos[0].value || user.avatar;
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }

        // 3. Create new user with Google profile info
        const names = profile.displayName.split(" ");
        const firstName = names[0];
        const lastName = names[names.length - 1];

        // Generate a random password (required by our schema)
        const randomPassword = Math.random().toString(36);

        // First create the user without username
        user = await User.create({
          firstName, // Add firstName from Google profile
          lastName, // Add lastName from Google profile
          email: profile.emails[0].value,
          googleId: profile.id,
          avatar: profile.photos[0].value || "default.jpg",
          password: randomPassword,
          passwordConfirm: randomPassword,
          username: "temp" // temporary username just to pass validation
        });

        // Now update the username using the generated _id
        const username = `user_${user._id.toString().slice(-8)}`;
        user.username = username;
        await user.save({ validateBeforeSave: false });

        return done(null, user);
      } catch (err) {
        console.error("Google Strategy Error:", err);
        done(err, null);
      }
    }
  )
);

// GITHUB AUTH - Update this section in your passport.js file
passport.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ["user:email"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Get email from GitHub profile
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : null;

        if (!email) {
          return done(new Error("Email access is required"), null);
        }

        // 1. First, check if user exists with this email address
        let user = await User.findOne({ email });
        
        if (user) {
          // User with this email already exists
          if (user.githubId) {
            // Github account already linked, just log in
            return done(null, user);
          } else {
            // User exists but GitHub not linked - update user to link GitHub
            user.githubId = profile.id;
            // Take GitHub profile photo if user doesn't have one
            if (!user.avatar || user.avatar === 'default.jpg') {
              user.avatar = profile.photos && profile.photos.length > 0
                ? profile.photos[0].value
                : user.avatar;
            }
            // Save the updated user with GitHub info
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }
        }

        // 2. If no user exists with this email, create a new user
        const username = profile.username || profile.login;
        const names = profile.displayName
          ? profile.displayName.split(" ")
          : [username, ""];

        const firstName = names[0] || username;
        const lastName = names.length > 1 ? names[names.length - 1] : "";

        // Generate random password for security
        const randomPassword = Math.random().toString(36);

        // Create new user with GitHub data
        user = await User.create({
          firstName,
          lastName,
          username,
          githubId: profile.id,
          avatar:
            profile.photos && profile.photos.length > 0
              ? profile.photos[0].value
              : "default.jpg",
          email,
          password: randomPassword,
          passwordConfirm: randomPassword,
          emailVerified: true // Important: mark email as verified since GitHub verifies emails
        });

        return done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// Store user.id in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Get user data from session using stored ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
module.exports = passport;
