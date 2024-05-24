import React from 'react';
import axios from 'axios';

const serverUrl = process.env.REACT_APP_SERVER_URL;

function UrlGen() {
  async function getUrls(event) {
    event.preventDefault();
    const target = event.target;
    //for each of the urls in the range, save the image to a google drive folder
    await axios.post('/urlRange', {
      prefix: target.prefix.value,
      start: target.start.value,
      end: target.end.value,
      suffix: target.suffix.value,
      digitCount: target.digitCount.value,
    })
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      // console.log(error);
    });
  }

  return (
    <form onSubmit={getUrls}>
      Prefix: <input name="prefix" />
      <hr />
      Start: <input name="start" />
      <hr />
      End: <input name="end" />
      <hr />
      Suffix: <input name="suffix" />
      <hr />
      Digit Count: <input name="digitCount" />
      <hr />
      <button type="submit">Search</button>
    </form>
  );
}

export default UrlGen;