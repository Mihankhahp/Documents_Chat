import React from "react";
import Card from "./primitives/Card";
import Button from "./primitives/Button";
import { resetUser } from "../services/api";

export default function AdminPanel({ userId, onReset }) {
  return (
    <Card title="Admin">
      <div className="space-y-2">
        <Button variant="danger" onClick={onReset}>Reset user data</Button>
        <div className="text-xs text-gray-500">Removes your uploaded documents and vectors from the server for this user.</div>
      </div>
    </Card>
  );
}
