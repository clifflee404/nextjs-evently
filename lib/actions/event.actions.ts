'use server'

import { CreateEventParams, DeleteEventParams, GetAllEventsParams } from "@/types";
import { connectToDatabase } from "../database";
import User from "../database/models/user.model";
import Event from "../database/models/event.model";
import { revalidatePath } from "next/cache";
import { handleError } from "../utils";
import Category from "../database/models/category.model";

const getCategoryByName = async (name: string) => {
  return Category.findOne({ name: { $regex: name, $options: 'i' } })
}

const populateEvent = (query: any) => {
  return query
    .populate({ path: 'organizer', model: User, select: '_id firstName lastName' })
    .populate({ path: 'category', model: Category, select: '_id name' })
}

export async function createEvent({ userId, event, path}: CreateEventParams){
  try {
    await connectToDatabase()

    const organizer = await User.findById(userId)
    if(!organizer){
      throw new Error('Organizer not found')
    }

    const newEvent = await Event.create({
      ...event,
      category: event.categoryId,
      organizer: userId
    })
    revalidatePath(path)

    return JSON.parse(JSON.stringify(newEvent))
  } catch (error) {
    handleError(error)
  }
}

export async function getEventById(eventId: string){
  try {
    await connectToDatabase()

    const event = await populateEvent(Event.findById(eventId))

    if(!event) throw new Error('Event not found')

    return JSON.parse(JSON.stringify(event))
  } catch (error) {
    handleError(error)
  }
}

export const getAllEvents = async ({query, limit=6, page, category}: GetAllEventsParams) => {
  try {
    await connectToDatabase()

    const titleCondition = query ? { title: { $regex: query, $options: 'i' } } : {}
    const categoryCondition = category ? await getCategoryByName(category) : null
    const conditions = {
      $and: [titleCondition, categoryCondition ? { category: categoryCondition._id } : {}],
    }

    const skipAmount = (Number(page) - 1) * limit
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(limit)

    const events = await populateEvent(eventsQuery)
    const eventsCount = await Event.countDocuments(conditions)

    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit)
    }
  } catch (error) {
    
  }
}

export async function deleteEvent({ eventId, path }: DeleteEventParams){
  try {
    await connectToDatabase()

    const deleteEvent = await Event.findByIdAndDelete(eventId)
    if(deleteEvent) revalidatePath(path)
  } catch (error) {
    handleError(error)
  }
}
