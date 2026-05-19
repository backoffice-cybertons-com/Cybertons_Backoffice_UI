import React, { useState } from "react";
import { Input } from "reactstrap";

const KanbanQuickAddCard = ({ columnId, onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setIsOpen(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) return;

    onAdd({
      kanId: columnId,
      title: trimmedTitle,
      text: description.trim(),
    });

    reset();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="btn btn-soft-info w-100"
        onClick={() => setIsOpen(true)}
      >
        <i className="ri-add-line align-bottom me-1"></i>
        Add Card
      </button>
    );
  }

  return (
    <form className="border rounded bg-white p-2 shadow-sm" onSubmit={handleSubmit}>
      <Input
        autoFocus
        className="mb-2"
        placeholder="Card title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        type="textarea"
        rows="2"
        className="mb-2"
        placeholder="Short description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm">
          Add
        </button>
        <button type="button" className="btn btn-light btn-sm" onClick={reset}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default KanbanQuickAddCard;
