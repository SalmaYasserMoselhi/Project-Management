import React, { useState, useEffect } from "react";

const avatarColors = [
  "#4D2D61",
  "#7b4397",
  "#3498db",
  "#2ecc71",
  "#e74c3c",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#34495e",
];

const getInitials = (user) => {
  if (!user) return "?";
  const { firstName, username, email } = user;
  if (firstName) return firstName.charAt(0).toUpperCase();
  if (username) return username.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
};

const getBackgroundColor = (user) => {
  const identifier =
    user?._id || user?.id || user?.username || user?.email || "";
  if (!identifier) return avatarColors[0];
  const charCodeSum = identifier
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colorIndex = charCodeSum % avatarColors.length;
  return avatarColors[colorIndex];
};

const UserAvatar = ({ user, className = "h-8 w-8" }) => {
  const [hasError, setHasError] = useState(false);

  const userData = user?.user || user;

  useEffect(() => {
    setHasError(false);
  }, [userData?.avatar]);

  const avatarUrl = userData?.avatar;
  const showFallback =
    hasError || !avatarUrl || avatarUrl === "null" || avatarUrl === "undefined";

  const displayName = userData?.firstName || userData?.username || "User";

  if (showFallback) {
    return (
      <div
        className={`${className} rounded-full flex items-center justify-center text-white font-bold text-sm object-cover`}
        style={{ backgroundColor: getBackgroundColor(userData) }}
        title={displayName}
      >
        {getInitials(userData)}
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={displayName}
      title={displayName}
      className={`${className} rounded-full object-cover`}
      onError={() => setHasError(true)}
    />
  );
};

export default UserAvatar;
