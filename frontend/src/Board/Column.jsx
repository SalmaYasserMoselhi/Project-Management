import vector from "../assets/Vector.png";
import TaskCard from "./TaskCard";
import icon from "../assets/icon.png";

const Column = ({ title, count, className }) => {
  return (
    <div
      className={`p-2 rounded-lg mb-4 md:mb-0 md:mr-4 ${className} min-w-[300px]`}
    >
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
        <div className="flex items-center">
          <h3 className="text-black font-semibold me-2">
            {title}{" "}
            <span
              className="px-2 py-1 rounded-full text-sm ms-2"
              style={{ backgroundColor: "#A855F71A" }}
            >
              {count}
            </span>
          </h3>
        </div>
        <div className="flex items-center">
          <img src={vector} alt="Photo 1" className="w-[18px] h-[4px]" />
        </div>
      </div>

      <div>
        <TaskCard priority="High" fileCount={2} commentCount={4} />
        <TaskCard priority="High" fileCount={3} commentCount={7} />
        <TaskCard priority="High" fileCount={3} commentCount={7} />
        <TaskCard priority="High" fileCount={5} commentCount={12} />
      </div>

      <button className="bg-white mt-3 py-3 w-full rounded-md border border-[#F2F4F7] shadow-sm transition-all hover:shadow-md">
        <img
          src={icon}
          className="w-5 h-5 block mx-auto hover:brightness-80"
          alt="Add task"
        />
      </button>
    </div>
  );
};

export default Column;
