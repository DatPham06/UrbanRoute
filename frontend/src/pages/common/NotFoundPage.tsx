import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 text-blue-400 mx-auto flex items-center justify-center">
          <MapPinOff className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">404 - Không tìm thấy trang</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Địa chỉ URL bạn truy cập không tồn tại hoặc đã được di chuyển trên hệ thống UrbanRoute.
        </p>
        <div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chính</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
