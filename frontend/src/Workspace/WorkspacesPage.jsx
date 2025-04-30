// import { useEffect, useState } from "react";
// import api from "../api"; // adjust if your api.js is in another place
// import WorkspacePopup from "./WorkspacePopup"; // you already have it

// const WorkspacesPage = () => {
//   const [workspaces, setWorkspaces] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [selectedWorkspace, setSelectedWorkspace] = useState(null);

//   useEffect(() => {
//     fetchWorkspaces();
//   }, []);

//   const fetchWorkspaces = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get("/api/v1/workspaces/user-workspaces");
//       setWorkspaces(response.data);
//       console.log("Fetched workspaces:", response.data);
//       setLoading(false);
//     } catch (err) {
//       console.error(err);
//       setError("Failed to load workspaces");
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-5 font-[Nunito]">
//       <h1 className="text-3xl font-bold mb-5 text-[#4D2D61]">Your Workspaces</h1>

//       {loading && <p>Loading...</p>}
//       {error && <p className="text-red-500">{error}</p>}

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {workspaces.map((workspace) => (
//           <div
//             key={workspace._id}
//             onClick={() => setSelectedWorkspace(workspace)}
//             className="p-5 rounded-xl shadow hover:shadow-lg cursor-pointer bg-white hover:scale-[1.02] transition"
//           >
//             <h2 className="text-xl font-semibold text-[#4D2D61]">{workspace.name}</h2>
//             <p className="text-gray-600">{workspace.description}</p>
//             <p className="mt-2 text-sm text-gray-400">Type: {workspace.type}</p>
//           </div>
//         ))}
//       </div>

//       {/* If workspace is selected, show WorkspacePopup */}
//       {selectedWorkspace && (
//      <WorkspacePopup
//     workspaceId={selectedWorkspace._id} // Make sure this is the correct ID
//     workspaceName={selectedWorkspace.name}
//     onClose={() => setSelectedWorkspace(null)}
//     />
// )}
//     </div>
//   );
// };

// export default WorkspacesPage;



import { useEffect, useState } from "react";
import api from "../api"; // adjust if your api.js is in another place
import WorkspacePopup from "./WorkspacePopup"; // you already have it

const WorkspacesPage = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    console.log("useEffect called");
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      console.log("Start fetching workspaces...");
      
      const response = await api.get("/api/v1/workspaces/user-workspaces");
  
      console.log("Full API Response:", response);
  
      if (response.data && response.data.length > 0) {
        console.log("Fetched workspaces:", response.data);
      } else {
        console.log("Fetched workspaces: EMPTY ARRAY []");
      }
  
      setWorkspaces(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error while fetching:", err);
      setError("Failed to load workspaces");
      setLoading(false);
    }
  };
  

  return (
    <div className="p-5 font-[Nunito]">
      <h1 className="text-3xl font-bold mb-5 text-[#4D2D61]">Your Workspaces</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace) => (
          <div
            key={workspace._id}
            onClick={() => setSelectedWorkspace(workspace)}
            className="p-5 rounded-xl shadow hover:shadow-lg cursor-pointer bg-white hover:scale-[1.02] transition"
          >
            <h2 className="text-xl font-semibold text-[#4D2D61]">{workspace.name}</h2>
            <p className="text-gray-600">{workspace.description}</p>
            <p className="mt-2 text-sm text-gray-400">Type: {workspace.type}</p>
          </div>
        ))}
      </div>

      {/* If workspace is selected, show WorkspacePopup */}
      {selectedWorkspace && (
        <WorkspacePopup
          workspaceId={selectedWorkspace._id} // Make sure this is the correct ID
          workspaceName={selectedWorkspace.name}
          onClose={() => setSelectedWorkspace(null)}
        />
      )}
    </div>
  );
};

export default WorkspacesPage;
