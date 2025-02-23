

// const TaskCard = ({ priority }) => {
//     const priorityStyles = {
//         Low: "bg-[#FEE2E2] text-[#DC2626]", // Light Red BG, Dark Red Text
//         Medium: "bg-[#EDE9FE] text-[#7C3AED]", // Light Purple BG, Dark Purple Text
//         High: "bg-[#DCFCE7] text-[#16A34A]", // Light Green BG, Dark Green Text
//       };
    

//   return (
//     <div className="bg-white text-black p-3 rounded-lg mb-3 shadow-lg ">
//       <h4 className="font-semibold mt-1 mb-3">Model Answer</h4>
//  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityStyles[priority]}`}>
// {priority}
// </span> 
//       {/* Avatar and Actions */}
//       <div className="flex justify-between items-center mt-5">
//         <div className="flex -space-x-2">
//           {/* <img src="src/assets/Avatar1.png" className="w-6 h-6 rounded-full border-2 border-white" alt="avatar"/> */}
//           {/* <img src="src/assets/Avatar2.png" className="w-7 h-7 rounded-full border-2 border-white" alt="avatar"/> */}
//           <img src="src/assets/Avatar3.png" className="w-7 h-7 rounded-full border-2 border-white" alt="avatar"/>
//           <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-medium mt-1">
//                 +5
//         </span>
//         <img
//                 src="src/assets/Add Button.png"
//                 alt="Add"
//                 className="w-7 h-7  ms-4 rounded-full border-2 border-white bg-gray-200 cursor-pointer"
//         />

//         </div>
//         <button className="text-gray-500">🗑</button>
//       </div>
//     </div>
//   );
// };

// export default TaskCard;

// const TaskCard = ({ priority }) => {
//   const priorityStyles = {
//       Low: "bg-[#FEE2E2] text-[#DC2626]",
//       Medium: "bg-[#EDE9FE] text-[#7C3AED]",
//       High: "bg-[#DCFCE7] text-[#16A34A]",
//   };

//   return (
//       <div className="flex rounded-lg overflow-hidden shadow-lg min-w-[250px] mb-3">
//           {/* Left colored section - narrower */}
//           <div 
//               className="w-10 bg-[#4D2D61] flex items-center justify-center" // Changed from w-12 to w-10
//               style={{ minHeight: '100px' }}
//           >
//               <svg 
//                   className="w-5 h-5 text-white" // Slightly smaller icon
//                   fill="none" 
//                   stroke="currentColor" 
//                   viewBox="0 0 24 24"
//               >
//                   <path 
//                       strokeLinecap="round" 
//                       strokeLinejoin="round" 
//                       strokeWidth={2} 
//                       d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
//                   />
//               </svg>
//           </div>

//           {/* Main content - wider */}
//           <div className="bg-white text-black p-3 rounded-r-lg flex-grow w-full">
//               {/* Rest of your content remains the same */}
//               <h4 className="font-semibold mt-1 mb-3">Model Answer</h4>
//               <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityStyles[priority]}`}>
//                   {priority}
//               </span>

//               <div className="flex justify-between items-center mt-5">
//                   <div className="flex -space-x-2">
//                       <img src="src/assets/Avatar3.png" className="w-7 h-7 rounded-full border-2 border-white" alt="avatar"/>
//                       <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm font-medium mt-1">
//                           +5
//                       </span>
//                       <img
//                           src="src/assets/Add Button.png"
//                           alt="Add"
//                           className="w-7 h-7 ms-4  rounded-full border-2 border-white bg-gray-300 cursor-pointer"
//                       />
//                   </div>
                  
//               </div>
//           </div>
//       </div>
//   );
// }

//  export default TaskCard;

// const TaskCard = ({ priority }) => {
//   const priorityStyles = {
//       Low: "bg-[#FEE2E2] text-[#DC2626]",
//       Medium: "bg-[#EDE9FE] text-[#7C3AED]",
//       High: "bg-[#DCFCE7] text-[#16A34A]",
//   };

//   return (
//       <div className="flex rounded-lg overflow-hidden shadow-lg min-w-[260px] mb-3">
//           {/* Left colored section */}
//           <div 
//               className="w-10 bg-[#4D2D61] flex items-center justify-center"
//               style={{ minHeight: '100px' }}
//           >
//               <svg 
//                   className="w-5 h-5 text-white"
//                   fill="none" 
//                   stroke="currentColor" 
//                   viewBox="0 0 24 24"
//               >
//                   <path 
//                       strokeLinecap="round" 
//                       strokeLinejoin="round" 
//                       strokeWidth={2} 
//                       d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
//                   />
//               </svg>
//           </div>

//           {/* Main content */}
//           <div className="bg-white text-black p-3 rounded-r-lg flex-grow w-full">
//               <h4 className="font-semibold mt-1 mb-3">Model Answer</h4>
//               <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityStyles[priority]}`}>
//                   {priority}
//               </span>

//               <div className="flex justify-between items-center mt-5">
//                   <div className="flex -space-x-2">
//                       <img src="src/assets/Avatar3.png" className="w-7 h-7 rounded-full border-2 border-white" alt="avatar"/>
//                       <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm  mt-1">
//                           +5
//                       </span>
//                       <img
//                           src="src/assets/Add Button.png"
//                           alt="Add"
//                           className="w-7 h-7 ms-4 rounded-full border-2 border-white bg-gray-300 cursor-pointer"
//                       />
//                   </div>
                  
//                   {/* Add your three icons here */}
//                   <div className="flex gap-2 ml-4">
//                       {/* Icon 1 */}
//                       <img 
//                           src="src\assets\prime_list.png" 
//                           className="w-6 h-6 cursor-pointer hover:opacity-75"
//                           alt="Icon 1"
//                       />
//                       {/* Icon 2 */}
//                       <img 
//                           src="src\assets\file_present.png" 
//                           className="w-6 h-6 cursor-pointer hover:opacity-75"
//                           alt="Icon 2"
//                       />
//                       {/* Icon 3 */}
//                       <img 
//                           src="src\assets\third.png" 
//                           className="w-5 h-5 cursor-pointer hover:opacity-75 mt-1"
//                           alt="Icon 3"
//                       />
//                   </div>
//               </div>
//           </div>
//       </div>
//   );
// }

// export default TaskCard;


const TaskCard = ({ priority, fileCount = 3, commentCount = 5 }) => {
  const priorityStyles = {
    Low: "bg-[#FEE2E2] text-[#DC2626]",
    Medium: "bg-[#EDE9FE] text-[#7C3AED]",
    High: "bg-[#DCFCE7] text-[#16A34A]",
  };

  return (
    <div className="flex rounded-lg overflow-hidden shadow-lg min-w-[275px] mb-3">
      {/* Left colored section */}
      <div 
        className="w-10 bg-[#4D2D61] flex items-center justify-center"
        style={{ minHeight: '100px' }}
      >
        <svg 
          className="w-5 h-5 text-white"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
          />
        </svg>
      </div>

      {/* Main content */}
      <div className="bg-white text-black p-3 rounded-r-lg flex-grow w-full">
        <h4 className="font-semibold mt-1 mb-3">Model Answer</h4>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityStyles[priority]}`}>
          {priority}
        </span>

        <div className="flex justify-between items-center mt-5">
          <div className="flex -space-x-2">
            <img src="src/assets/Avatar3.png" className="w-7 h-7 rounded-full border-2 border-white" alt="avatar"/>
            <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded-full border-2 border-white text-sm mt-1">
              +5
            </span>
            <img
              src="src/assets/Add Button.png"
              alt="Add"
              className="w-7 h-7 ms-3 rounded-full border-2 border-white bg-gray-300 cursor-pointer"
            />
          </div>
          
          {/* Icons with counts */}
          <div className="flex gap-2 ml-4 items-center ">
            {/* List icon */}
            <img 
              src="src/assets/prime_list.png " 
              className="w-6 h-6 cursor-pointer hover:opacity-70 "
              alt="Checklist"
            />

            {/* File icon with count */}
            <div className="flex items-center gap-0 ">
              <img 
                src="src/assets/file_present.png" 
                className="w-5 h-5 cursor-pointer hover:opacity-70"
                alt="Files"
              />
              <span className="text-sm text-gray-600 font-bold mt-1">{fileCount}</span>
            </div>

            {/* Comment icon with count */}
            <div className="flex items-center gap-1 ">
              <img 
                src="src/assets/third.png" 
                className="w-5 h-5 cursor-pointer hover:opacity-70 mt-1"
                alt="Comments"
              />
              <span className="text-sm text-gray-600 font-bold mt-1">{commentCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;

