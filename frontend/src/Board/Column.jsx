
// import TaskCard from "./TaskCard";

// const Column = ({ title, count }) => {
//   return (
//     <div className=" p-6 rounded-lg w-[20vw]  ">
//       {/* Column Header */}
//       <div className="flex justify-between items-center mb-3 bg-white  ">
//         <h3 className=" text-black font-semibold me-5">{title} <span className=" px-2 py-1 rounded text-sm bg-">{count}</span></h3>
//         <button className="text-gray-400">⋮</button>
//       </div>

//       {/* Tasks */}
//       <TaskCard priority="Low" />
//       <TaskCard priority="Medium" />
//       <TaskCard priority="High" />

//       {/* Add Task Button */}
//       <button className="text-black bg-white mt-3 py-2 w-full rounded-md">+</button>
//     </div>
//   );
// };

// export default Column;
import TaskCard from "./TaskCard";

const Column = ({ title, count ,className}) => {
  return (
    // <div className="p-7 rounded-lg w-[22vw] mr-10 ">
      <div className={`p-1 rounded-lg mr-4 ${className}`}>
      {/* Column Header */}
      <div className="flex justify-between items-center mb-7  bg-white p-3 rounded-lg shadow-sm ">
        {/* Title and Count */}
        <div className="flex items-center">
          <h3 className="text-black font-semibold me-5">
            {title}{" "}
            <span className="px-2 py-1 rounded-full text-sm ms-2" style={{ backgroundColor: '#A855F71A' }}>
              {count}
            </span>
          </h3>
        </div>

        {/* Right-aligned Clickable Images */}
        <div className="flex items-center">
          <img
            src="src\assets\Vector.png"
            alt="Photo 1"
            className="w-4 h-1 mr-3"
            
          />
          <img
            src="src\assets\adding.png"
            alt="Photo 2"
            className="w-6 h-6  cursor-pointer mx-1 -mr-1"
            
          />
        </div>
      </div>

      {/* Tasks */}
      <TaskCard 
       priority="High" 
       fileCount={2} 
       commentCount={4}
      />
      <TaskCard 
       priority="Low" 
       fileCount={3} 
       commentCount={7}
      />
      <TaskCard 
       priority="Medium" 
       fileCount={5} 
       commentCount={12}
      />
      {/* <TaskCard priority="Low" />
      <TaskCard priority="Medium" />
      <TaskCard priority="High" /> */}

      {/* Add Task Button */}
      {/* <button className="text-black bg-white mt-3 py-2 w-full rounded-md min-w-[275px] ">+</button> */}
      <button className="bg-white mt-3 py-3 w-full rounded-md min-w-[275px]  transition-all">
           <img 
            src="src/assets/icon.png" 
            className="w-5 h-5 block mx-auto hover:brightness-80" 
            alt="Add task"
           />
         </button>
    </div>
  );
};

export default Column;



