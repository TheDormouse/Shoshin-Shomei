// Any page.jsx handles server functions for that route segment. 

import Client from "./client";
const url = process.env.API_URL
const token = process.env.API_KEY
const api = {url, token}

export default function Home(){
    return(
        <>
        <Client api={api}/>
        </>
    )
}