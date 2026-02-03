import React from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export const ErrorCard = ({ title = "Something went wrong", message, onRetry }) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="font-semibold text-red-900 mb-2">{title}</h3>
        <p className="text-sm text-red-700 mb-4">
          {message || "Unable to load data. Please try again."}
        </p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="border-red-300 text-red-700 hover:bg-red-100">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const LoadingCard = ({ message = "Loading..." }) => {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">{message}</p>
      </CardContent>
    </Card>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
      {action}
    </div>
  );
};
