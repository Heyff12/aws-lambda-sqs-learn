import React, { useEffect, useState } from 'react';
import axios from 'axios'
import {Carousel} from 'react-bootstrap'
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css'

function App() {
  const baseUri: string = process.env.REACT_APP_API_URI!;

  const [allPthotos, setAllPhotos] = useState([])

  async function fetchPhotos (){
    const {data} = await axios.get(`${baseUri}/getAllPhotos`)
    console.log(data)
    setAllPhotos(data)
  }

  useEffect(()=>{
    fetchPhotos()
  },[])


  function getCarouselImage(photo:any){
    console.log(photo.filename)
    return (
      <Carousel.Item interval={1000} style={{height: 350}}>
        <img src={photo.url} alt={photo.filename} className='h-100' />
        <Carousel.Caption>
          <h3 style={{backgroundColor:'rgba(0,0,0,.3)'}}>{photo.filename}</h3>
        </Carousel.Caption>
      </Carousel.Item>
    )
  }

  return (
    <div className="App bg-secondary min-vh-100">
      <h1 className='display-3  p-3 mb-5'>Some logos</h1>
      <Carousel>
        {
          allPthotos.map(photo=>getCarouselImage(photo))
        }
      </Carousel>
    </div>
  );
}

export default App;
