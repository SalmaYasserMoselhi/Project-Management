// import { useState, useEffect, useRef } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { updateDueTime } from "../features/Slice/cardSlice/cardDetailsSlice";
// import TimePicker from "../Components/TimePicker";

// export default function CardDueTime() {
//   const dispatch = useDispatch();
//   const storedDueTime = useSelector((state) => state.cardDetails.dueTime);
//   const [isPickerOpen, setIsPickerOpen] = useState(false);
//   const timePickerContainerRef = useRef(null);

//   // Initialize with stored time or current time + 1 hour
//   const initializeTime = () => {
//     if (storedDueTime) {
//       return new Date(storedDueTime);
//     }
//     // Set time to next hour by default
//     const now = new Date();
//     now.setMinutes(0);
//     now.setHours(now.getHours() + 1);
//     return now;
//   };

//   const [selectedTime, setSelectedTime] = useState(initializeTime);

//   // Update Redux when time changes
//   useEffect(() => {
//     dispatch(updateDueTime(selectedTime.toISOString()));
//   }, [selectedTime, dispatch]);

//   // Add click outside to close the picker in CardDueTime component
//   useEffect(() => {
//     function handleClickOutside(event) {
//       if (
//         timePickerContainerRef.current &&
//         !timePickerContainerRef.current.contains(event.target) &&
//         isPickerOpen
//       ) {
//         setIsPickerOpen(false);
//       }
//     }

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [isPickerOpen]);

//   const toggleTimePicker = (e) => {
//     setIsPickerOpen(!isPickerOpen);
//   };

//   // Format time for display
//   const formatTime = (time) => {
//     return time.toLocaleTimeString("en-EG", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     });
//   };

//   return (
//     <div className="flex flex-row items-center mt-4 w-full max-[320px]:flex-col max-[320px]:items-start">
//       {/* Due Time Icon and Label */}
//       <div className="w-30 text-gray-500 flex items-center">
//         <svg
//           className="w-5 h-5 mr-2"
//           viewBox="0 0 24 24"
//           fill="none"
//           stroke="currentColor"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
//           />
//         </svg>
//         Due Time
//       </div>

//       {/* Time Field with Clock Icon */}
//       <div
//         className="relative max-[320px]:ml-4 max-[320px]:mt-2"
//         ref={timePickerContainerRef}
//       >
//         <div
//           className="px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-400 flex items-center cursor-pointer w-26 max-[320px]:w-full"
//           onClick={toggleTimePicker}
//         >
//           <span className="mr-1">{formatTime(selectedTime)}</span>
//           <svg
//             className="w-4 h-4 text-gray-500 ml-auto"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//           >
//             <path
//               strokeLinecap="round"
//               strokeLinejoin="round"
//               strokeWidth={2}
//               d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
//             />
//           </svg>
//         </div>

//         {/* Custom Time Picker */}
//         <TimePicker
//           initialTime={selectedTime}
//           onTimeChange={setSelectedTime}
//           isOpen={isPickerOpen}
//           onClose={() => setIsPickerOpen(false)}
//         />
//       </div>
//     </div>
//   );
// }
