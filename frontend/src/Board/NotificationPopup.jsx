
// import { forwardRef } from "react";
// import notify from "../assets/NotificationImage.png";

// const NotificationPopup = forwardRef((props, ref) => {
//   return (
//     <div
//       ref={ref}
//       className={`absolute top-12 right-4 w-[350px] bg-white shadow-md rounded-lg z-50 border border-gray-200 transform transition-opacity duration-300 ease-in-out opacity-100`}
//     >
//       {/* Header */}
//       <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
//         <h2 className="text-sm font-semibold text-black">All Notifications</h2>
//         <button className="text-sm text-gray-500 hover:underline">
//           Mark all as read
//         </button>
//       </div>

//       {/* Body */}
//       <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
//         <img
//           src={notify}
//           alt="No notifications"
//           className="w-[200px] h-[130px] mb-3 opacity-90 mt-10"
//         />
//         <p className="text-md font-semibold text-gray-800 mb-1">
//           No notification yet
//         </p>
//         <p className="text-md text-gray-500">
//           All notifications will show up here.
//         </p>
//       </div>
//     </div>
//   );
// });

// export default NotificationPopup;

// import { forwardRef } from "react";
// import notify from "../assets/NotificationImage.png";

// const NotificationPopup = forwardRef(({ notifications, loading, unreadCount }, ref) => {
//   return (
//     <div
//       ref={ref}
//       className="absolute top-12 right-4 w-[350px] bg-white shadow-md rounded-lg z-50 border border-gray-200 transform transition-opacity duration-300 ease-in-out opacity-100"
//     >
//       {/* Header */}
//       <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
//         <h2 className="text-sm font-semibold text-black">All Notifications</h2>
//         <button className="text-sm text-gray-500 hover:underline">
//           Mark all as read
//         </button>
//       </div>

//       {/* Body */}
//       <div className="max-h-[300px] overflow-y-auto">
//         {loading ? (
//           <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
//         ) : notifications.length === 0 ? (
//           <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
//             <img
//               src={notify}
//               alt="No notifications"
//               className="w-[200px] h-[130px] mb-3 opacity-90 mt-10"
//             />
//             <p className="text-md font-semibold text-gray-800 mb-1">
//               No notification yet
//             </p>
//             <p className="text-md text-gray-500">
//               All notifications will show up here.
//             </p>
//           </div>
//         ) : (
//           <ul className="divide-y divide-gray-200">
//             {notifications.map((notif) => (
//               <li key={notif._id} className="px-5 py-3 text-sm text-gray-700 hover:bg-gray-50">
//                 {notif.message}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// });

// export default NotificationPopup;
import { forwardRef } from "react";
import notify from "../assets/NotificationImage.png";

const NotificationPopup = forwardRef(({ notifications, loading, unreadCount }, ref) => {
  return (
    <div
      ref={ref}
      className="absolute top-12 right-4 w-[350px] bg-white shadow-md rounded-lg z-50 border border-gray-200 transform transition-opacity duration-300 ease-in-out opacity-100"
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-black">All Notifications</h2>
        <button className="text-sm text-gray-500 hover:underline">
          Mark all as read
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <img
              src={notify}
              alt="No notifications"
              className="w-[200px] h-[130px] mb-3 opacity-90 mt-10"
            />
            <p className="text-md font-semibold text-gray-800 mb-1">
              No notification yet
            </p>
            <p className="text-md text-gray-500">
              All notifications will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notifications.map((notif) => (
              <li
                key={notif._id}
                className="px-5 py-3 text-sm text-gray-700 mb-2 mt-1 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="text-gray-900">{notif.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(notif.createdAt).toLocaleString('en-US', {
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).replace(' at ', ' at ') || 'Monday at 07:00'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

export default NotificationPopup;
