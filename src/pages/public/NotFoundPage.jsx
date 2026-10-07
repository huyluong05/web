import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Home } from "lucide-react";
export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFC] flex flex-col items-center justify-center p-6 text-center">
      {" "}
      <div className="w-16 h-16 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-2xl mb-6">
        {" "}
        404{" "}
      </div>{" "}
      <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">
        Trang không tồn tại
      </h1>{" "}
      <p className="text-sm text-slate-500 max-w-md mb-8">
        {" "}
        Địa chỉ bạn truy cập không tồn tại hoặc đã được di chuyển.{" "}
      </p>{" "}
      <Link to="/">
        {" "}
        <Button
          variant="primary"
          size="md"
          leftIcon={<Home className="w-4 h-4" />}
        >
          {" "}
          Về trang chủ{" "}
        </Button>{" "}
      </Link>{" "}
    </div>
  );
};
