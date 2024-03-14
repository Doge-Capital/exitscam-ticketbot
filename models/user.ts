import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    wallet: {
      type: String,
      required: true,
    },
    solAmount: {
      type: Number,
      required: true,
    },
    keys: {
      type: Number,
      required: true,
    },
    stakedAmount: {
      type: Number,
      required: true,
    },
    tier: {
      type: Number,
      required: true,
    },
    multiplier: {
      type: Number,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
