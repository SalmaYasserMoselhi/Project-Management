import { Link, useLocation } from "react-router-dom";

const Breadcrumb = ({ customLabel }) => {
  const location = useLocation();
  if (customLabel) {
    return (
      <nav className="text-sm font-medium text-gray-600">
        <ul className="flex items-center space-x-2">
          <li>
            <span className="text-gray-500 capitalize">{customLabel}</span>
          </li>
        </ul>
      </nav>
    );
  }
  const paths = location.pathname
    .split("/")
    .filter((path) => path)
    .slice(1); // حذف أول جزء فقط

  return (
    <nav className="text-lg font-medium bg-[#4d2d61] to bg-clip-text text-transparent">
      <ul className="flex items-center space-x-2">
        {paths.map((path, index) => {
          const routeTo = `/${paths.slice(0, index + 1).join("/")}`;
          const isLast = index === paths.length - 1;

          return (
            <li key={routeTo} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              {isLast ? (
                <span className="bg-[#4d2d61] bg-clip-text text-transparent capitalize">
                  {path.replace(/-/g, " ")}
                </span>
              ) : (
                <Link
                  to={routeTo}
                  className="capitalize text-[#4d2d61] hover:text-purple-900 transition-colors"
                >
                  {path.replace(/-/g, " ")}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumb;
