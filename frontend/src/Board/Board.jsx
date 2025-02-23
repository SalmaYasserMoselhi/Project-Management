
// import Column from "./Column";

// const Board = () => {
//   const columns = [
//     { title: "To Do Tasks", count: 3 },
//     { title: "In Process", count: 2 },
//     { title: "In Review", count: 2 },
//     { title: "Done", count: 5 },
//   ];

//   return (
//     <div className="p-1  min-h-screen text-white font-[Nunito] mt-5">
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl text-black font-semibold">Board</h2>
//         <div className="flex gap-2">
//           <button className="bg-gray-400 px-4 py-2 rounded-md">Sort by ⬇</button>
//           <button className="bg-gray-800 px-4 py-2 rounded-md">Filter by ⬇</button>
//         </div>
//       </div>

//       <div className="grid grid-cols-4 gap-30 -ms-11">
//         {columns.map((col, index) => (
//           <Column key={index} title={col.title} count={col.count} />
//         ))}
//       </div>
//     </div>
//   );
// };

// export default Board;



import Column from "./Column";

const Board = () => {
  const columns = [
    { title: "To Do Tasks", count: 3 },
    { title: "In Process", count: 2 },
    { title: "In Review", count: 2 },
    { title: "Done", count: 5 },
  ];

  return (
    <div className="p-4 min-h-screen text-white font-[Nunito] mt-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-black font-semibold">Board</h2>
        <div className="flex gap-2">
          <button className="bg-gray-400 px-4 py-2 rounded-md">Sort by ⬇</button>
          <button className="bg-gray-800 px-4 py-2 rounded-md">Filter by ⬇</button>
        </div>
      </div>

      {/* Scrollable columns container */}
      <div className="overflow-x-auto pb-4"> {/* Added horizontal scroll */}
        <div className="flex gap-4 min-w-[min-content]"> {/* Ensure content can expand */}
          {columns.map((col, index) => (
            <Column 
              key={index} 
              title={col.title} 
              count={col.count} 
              className="min-w-[300px]" // Set minimum column width
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Board;


