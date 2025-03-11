

import TaskCard from "./TaskCard";

const Column = ({ title, count, className }) => {
  return (
    <div className={`p-1 rounded-lg mr-4 ${className}`}>
      {/* Column Header */}
      <div className="flex justify-between items-center mb-7 bg-white p-3 rounded-lg shadow-sm">
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
            src="src/assets/Vector.png"
            alt="Photo 1"
            className="w-[18px] h-[4px]"
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
        priority="High" 
        fileCount={3} 
        commentCount={7}
      />
      <TaskCard 
        priority="High" 
        fileCount={5} 
        commentCount={12}
      />

      {/* Add Task Button */}
      <button className="bg-white mt-3 py-3 w-full rounded-md min-w-[275px] border border-[#F2F4F7] shadow-sm transition-all hover:shadow-md">
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


