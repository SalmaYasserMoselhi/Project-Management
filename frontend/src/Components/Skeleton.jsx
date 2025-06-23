const Skeleton = ({ className }) => {
  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      style={{
        animationDuration: "1.5s",
        animationTimingFunction: "ease-in-out",
        animationIterationCount: "infinite",
      }}
    ></div>
  );
};

export default Skeleton; 