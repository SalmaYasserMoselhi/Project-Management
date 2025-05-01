import moment from "moment";

export const dateHandler = (date) => {
  const now = moment();
  const momentDate = moment(date);
  const time = momentDate.fromNow(true);
  const dateByHourAndMin = momentDate.format("HH:mm");

  const getDay = () => {
    const days = parseInt(time.split(" ")[0], 10);
    if (isNaN(days)) return momentDate.format("DD/MM/YYYY");

    if (days < 8) {
      return moment().subtract(days, "days").format("dddd");
    } else {
      return momentDate.format("DD/MM/YYYY");
    }
  };

  if (time === "a few seconds") {
    return "Now";
  }

  if (time.includes("minute")) {
    const parts = time.split(" ");
    const mins = parts[0] === "a" ? 1 : parseInt(parts[0], 10);
    return `${mins} min`;
  }

  if (time.includes("hour")) {
    return dateByHourAndMin;
  }

  if (time === "a day") {
    return "Yesterday";
  }

  if (time.includes("days")) {
    return getDay();
  }

  return time;
};
