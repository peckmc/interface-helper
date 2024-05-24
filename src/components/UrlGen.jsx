import React, { useState } from 'react';
import axios from 'axios';

const serverUrl = process.env.REACT_APP_SERVER_URL;

function UrlGen() {
  const [urlList, setUrlList] = useState('');

  async function getUrls(event) {
    event.preventDefault();
    const { prefix, start, end, suffix, digitCount } = event.target;
    //get the urls formatted and listed, server-side
    await axios.get(`/urls?prefix=${prefix.value}&start=${start.value}&end=${end.value}&suffix=${suffix.value}&digitCount=${digitCount.value}`)
    .then((response) => {
      setUrlList(response.data);
    })
    .catch((error) => {
      // console.log(error);
    });
  }

  async function submitUrls(event) {
    event.preventDefault();
    let urls = urlList.split('\n');
    await axios.post('/urls', urls)
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      // console.log(error);
    });
  }

  return (
    <div>
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
        <button type="submit">Generate URLs</button>
      </form>

      <form onSubmit={submitUrls}>
        <hr />
        URLs (one per line):
        <textarea value={urlList} onChange={e => setUrlList(e.target.value)} name="urllist" rows={15} cols={250} />
        <hr />
        <button type="submit">Grab Text from Images</button>
      </form>
    </div>
  );
}

export default UrlGen;