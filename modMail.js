const { settings, colors, modmail } = require("./config");
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const {User, Channel} = require("./Utils/dbSchema")

module.exports = async (client) => {
    
    
    client.on("messageCreate", async message => {
        //Block bots and mentions
        if (message.author.bot) return;
        if (message.content.includes("@everyone") || message.content.includes("@here")) return message.author.send("You're not allowed to use those mentions.")
        let findUser = await User.findOne({user: message.author.id})
        if (!message.guild) {
            //Get guild and category from the Discord
            let guild = await client.guilds.fetch(modmail.guildId)
            let category = await guild.channels.fetch(modmail.category)
            let log = await guild.channels.fetch(modmail.log)
                //New ticket
                if (!findUser || findUser.ticket === false && findUser.blacklist === false) {
                    //Create new channel
                    let channel = await guild.channels.create({
                        name: message.author.username, 
                        type: ChannelType.GuildText,
                        topic: `User: ${message.author.tag}(${message.author.id})`,
                        parent: category,
                        permissionOverwrites: [
                            {id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel]},
                            {id: guild.roles.cache.get(modmail.modRole), allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.EmbedLinks,
                                PermissionFlagsBits.ReadMessageHistory,
                            ]},
                          ]
                    });
                    //Save channel and user data to database
                    let channelData = new Channel({userId: message.author.id, channelId: channel.id})
                    await channelData.save();
                    let UserData = new User({user: message.author.id, channel: channel.id, date: Date.now(), ticket: true})
                    await UserData.save();
                    //Send New Ticket info to logs and user
                    const newTicket = new EmbedBuilder()
                    .setAuthor({name: `${message.author.username}`, iconURL: message.author.avatarURL({ size: 1024, dynamic: false })})
				    .setDescription(`New ticket #${message.author.id}.`)
				    .setTimestamp()
    				.setColor(colors.positive)
                    log.send({embeds: [newTicket]})
                    message.author.send({embeds: [newTicket]})
                    //New ticket info for mods
                    const ticketInfoEmbed = new EmbedBuilder()
                    .setTitle("New Ticket")
                    .setColor(colors.positive)
                    .setDescription("Type a message in this channel to reply. Messages starting with the server prefix ! are ignored, and can be used for staff discussion. Use the command !close [reason] to close this ticket.")
                    .addFields([{name:"User",value: `${message.author} (${message.author.id})`, inline: true}])
                    .setFooter({text: `${message.author.tag} | (${message.author.id})`, iconURL: message.author.avatarURL({ size: 1024, dynamic: false })})
                    await channel.send({embeds: [ticketInfoEmbed]})
                    await channel.send({content: message.content || "Image:"})
                    if (message.attachments.size > 0) await channel.send({files: message.attachments.map(atc => atc.url)})
                    return;
                }
                //If user alredy has ticket 
                let userBlocked = findUser.blacklist;
                let channelHold = findUser.hold
                const userBlackListedEmbed = new EmbedBuilder()
                .setTitle("Ops")
                .setDescription("That server has blacklisted you from sending a message there.")
                .setColor(colors.red)
                //If user blacklisted
                if (findUser.blacklist === true) return message.author.send({embeds: [userBlackListedEmbed]})
                const channelHoldEmbed = new EmbedBuilder()
                .setTitle("Ops")
                .setDescription("Mods are holding your ticket, they will return as soon as possible.")
                .setColor(colors.negative)
                //If channel hold by mods
                if (findUser.hold === true) return message.author.send({embeds: [channelHoldEmbed]})
                const userMessageReceivedEmbed = new EmbedBuilder()
                .setTitle("Message Received")
                .setDescription(message.content || " ")
                .setAuthor({name: `${message.author.username}`, iconURL: message.author.avatarURL({ size: 1024, dynamic: false })})
                .setColor(colors.negative)
                .setTimestamp();
                //Else send message ticket channel
                if (message.attachments.size > 0) await guild.channels.cache.get(findUser.channel).send({files: message.attachments.map(atc => atc.url)})
                if (message.content.length > 0) await guild.channels.cache.get(findUser.channel).send({embeds: [userMessageReceivedEmbed]})
                return;
            }
            //Mod side
            let channel = await Channel.findOne({channel: message.channel.id})
            if (!channel) return;
            let user = await User.findOne({user: channel.userId})
            let author = await client.users.fetch(user.user)
            let isBlocked = user.blacklist;
            let isHold = user.hold;
            //Check user blacklisted
            //If user blacklisted ignore all messages
            if (isBlocked === true) return;
            //If message start with prefix message ignored
            if (message.content.startsWith(settings.prefix)) return;
            //If ticket is hold ignore message
            if (isHold === true) return;
            //Else send message to user
            
            const messageReceivedEmbed = new EmbedBuilder()
            .setTitle("Message Received")
            .setDescription(message.content || " ")
            .setAuthor({name: `${message.author.tag}`, iconURL: message.author.avatarURL({ size: 1024, dynamic: false })})
            .setColor(colors.negative)
            .setTimestamp();
            if (message.attachments.size > 0) await author.send({files: message.attachments.map(atc => atc.url)})
            if (message.content.length > 0) await author.send({embeds: [messageReceivedEmbed]})
   })
}