
 

const ProjectInfo = () => {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md w-full font-[Nunito]  -mt-15 -ml-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              Project Name{" "}
              <img
                src="src/assets/edit.png"
                alt="Edit"
                className="w-4 h-4 cursor-pointer ms-2"
              />
            </h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <img
                src="src/assets/CalendarBlank.png"
                alt="Clock"
                className="w-4 h-4"
              />{" "}
              20 July
            </p>
          </div>
          <div className="flex items-center gap-2 justify-end">
          
            <div className="flex -space-x-2">
             <img
                src="src\assets\share.png"
                alt="User 1"
                className="w-8 h-8 rounded-full border-2 border-white"
              />
              <img
                src="src\assets\Vector.png"
                alt="User 2"
                className="w-[18px] h-[4px] rounded-full border-2 border-white"
              />             
            </div>
          </div>
        </div>
        <p className="text-gray-600 mt-4">
          Fintech app development provides more freedom to banking and other
          financial institutions.
        </p>
        {/* <div className="mt-4">
          <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
            <div
              className="bg-[#4D2D61] h-2 rounded-full"
              style={{ width: "75%" }}
            ></div>
          </div>
        </div> */}
        {/* <div className="text-sm text-gray-600 mt-1">91 hours</div> */}
      </div>
    );
  };
  
  export default ProjectInfo;
  
  