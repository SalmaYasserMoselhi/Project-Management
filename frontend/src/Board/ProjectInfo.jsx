// import CalendarBlank from "../assets/CalendarBlank.png"
// const ProjectInfo = () => {
//   return (
//     <div className="bg-white p-6 rounded-2xl shadow-md w-full font-[Nunito] mb-2 mt-7">
//       <div className="flex flex-col md:flex-row justify-between items-start">
//         <div>
//           <h1 className="text-2xl font-semibold flex items-center gap-2">
//             Project Name{" "}
//             <img
//               src="src/assets/edit.png"
//               alt="Edit"
//               className="w-4 h-4 cursor-pointer ms-2"
//             />
//           </h1>
//           <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
//             <img
//               src={CalendarBlank}
//               alt="Clock"
//               className="w-4 h-4"
//             />{" "}
//             20 July
//           </p>
//         </div>
//         <div className="flex items-center gap-2 mt-4 md:mt-0">
//           <div className="flex -space-x-2">
//             <img
//               src="src/assets/share.png"
//               alt="User 1"
//               className="w-8 h-8 rounded-full border-2 border-white"
//             />
//             {/* <img
//               src="src/assets/Vector.png"
//               alt="User 2"
//               className="w-[18px] h-[4px] rounded-full border-2 border-white"
//             />              */}
//           </div>
//         </div>
//       </div>
//       <p className="text-gray-600 mt-4">
//         Fintech app development provides more freedom to banking and other
//         financial institutions.
//       </p>
//     </div>
//   );
// };
// // 
// export default ProjectInfo;

import CalendarBlank from "../assets/CalendarBlank.png";
import edit from "../assets/edit.png";
import share from "../assets/share.png"

const ProjectInfo = ({ isSidebarOpen }) => {
  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-md font-[Nunito] mb-2 mt-7 transition-all duration-300`}
      style={{
        width: isSidebarOpen ? "98%" : "100%",
              
      }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            Project Name{" "}
            <img
              src={edit}
              alt="Edit"
              className="w-4 h-4 cursor-pointer ms-2"
            />
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <img src={CalendarBlank} alt="Clock" className="w-4 h-4" /> 20 July
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <div className="flex -space-x-2">
            <img
              src={share}
              alt="User 1"
              className="w-8 h-8 rounded-full border-2 border-white"
            />
            {/* Additional user icons can go here */}
          </div>
        </div>
      </div>
      <p className="text-gray-600 mt-4">
        Fintech app development provides more freedom to banking and other
        financial institutions.
      </p>
    </div>
  );
};

export default ProjectInfo;
