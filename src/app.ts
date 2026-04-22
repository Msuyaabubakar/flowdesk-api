export default {};
app.get("/", (req, res) => {
  res.json({
    message: "FlowDesk API is running",
    status: "online"
  });
});